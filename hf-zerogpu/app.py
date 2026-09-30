import os, pathlib, subprocess, tarfile, time, hashlib, json
import requests
import gradio as gr
ROOT=pathlib.Path('/tmp/tomorrow-lev-runtime')
ROOT.mkdir(exist_ok=True)
os.environ['OPENBLAS_NUM_THREADS']='2'
jolt=ROOT/'jolt'
if not jolt.exists():
    archive=ROOT/'jolt.tar.gz'
    r=requests.get('https://github.com/jolt-lang/jolt/releases/download/v0.8.12/jolt-v0.8.12-x86_64-linux.tar.gz',timeout=120);r.raise_for_status();archive.write_bytes(r.content)
    jolt.mkdir()
    with tarfile.open(archive) as t:
        for member in t.getmembers():
            member.name='/'.join(member.name.split('/')[1:])
            if member.name: t.extract(member,jolt,filter='data')
os.environ['PATH']=str(jolt)+':'+os.environ['PATH']
lev=ROOT/'lev'
if not lev.exists():subprocess.run(['git','clone','--depth','1','--branch','v0.2.0','https://github.com/jlt-commons/lev',str(lev)],check=True)
subprocess.run(['jolt','kernels'],cwd=lev,check=True)
laya=ROOT/'laya'
base='https://huggingface.co/convaiinnovations/laya/resolve/c5d78730f3493e4fe16d61507ef4b78eef7318cf/'
for file in ['model.safetensors','tokenizer/tokenizer.json','tokenizer/tokenizer_config.json','encoder/config.json','rl_agent_config.json']:
    target=laya/file;target.parent.mkdir(parents=True,exist_ok=True)
    if not target.exists():
        with requests.get(base+file,stream=True,timeout=180) as response:
            response.raise_for_status()
            with target.open('wb') as out:
                for chunk in response.iter_content(1024*1024):out.write(chunk)
if hashlib.sha256((laya/'model.safetensors').read_bytes()).hexdigest()!='891102d372688fc2a094dac56a384bc537b87c63f21f9f3dac0be2b7cbc8d86c':raise RuntimeError('Checkpoint hash mismatch')
os.environ['LEV_CHECKPOINTS']=str(laya)
if not (lev/'data'/'config.json').exists():subprocess.run(['jolt','prepare'],cwd=lev,check=True)
server=subprocess.Popen(['jolt','-M:serve','--host','127.0.0.1','--port','8080'],cwd=lev)
for _ in range(120):
    try:
        if requests.get('http://127.0.0.1:8080/health',timeout=1).ok:break
    except requests.RequestException:pass
    if server.poll() is not None:raise RuntimeError('Lev failed at startup')
    time.sleep(1)
else:raise RuntimeError('Lev startup timed out')
def score(payload):
    if not isinstance(payload,dict):raise gr.Error('Expected JSON object')
    text=payload.get('state','');questions=payload.get('questions',{})
    if not isinstance(text,str) or len(text)>1600 or not isinstance(questions,dict) or len(questions)>20:raise gr.Error('Text or question limit exceeded')
    r=requests.post('http://127.0.0.1:8080/v1/systemone',json={'state':text,'questions':questions,'model':'english'},timeout=30)
    r.raise_for_status()
    return r.json()
with gr.Blocks() as demo:
    gr.Markdown('Lev text agreement only. Not handwriting verification or medical advice.')
    data=gr.JSON(label='Fictional linked text only');output=gr.JSON(label='Raw Lev score')
    gr.Button('Check text once').click(score,data,output,api_name='score',concurrency_limit=1)
demo.launch(server_name='0.0.0.0',server_port=7860,show_error=False)
