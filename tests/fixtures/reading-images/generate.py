from PIL import Image, ImageDraw, ImageFont, ImageFilter
import json,hashlib,random,pathlib
root=pathlib.Path(__file__).parent
font='/usr/share/fonts/truetype/dejavu/DejaVuSans-Oblique.ttf'
cases=[
 ('clear', ['1) SYN-A 15 mg 1 tablet 1-0-1 5 d','2) SYN-B 10 mg 2 tablets 0-0-1 3 d'], [('medicine_1','SYN-A'),('dose_1','15 mg'),('quantity_1','1 tablet'),('frequency_1','1-0-1'),('duration_1','5 d'),('medicine_2','SYN-B'),('dose_2','10 mg'),('quantity_2','2 tablets'),('frequency_2','0-0-1'),('duration_2','3 d')]),
 ('missing-units',['1) SYN-A 15 1-0-1','2) SYN-B 10 mg HS 3 X'],[('medicine_1','SYN-A'),('frequency_1','1-0-1'),('medicine_2','SYN-B'),('dose_2','10 mg'),('frequency_2','HS')]),
 ('procedure-only',['1) Foley monitor THS','2) Blood pressure check'],[]),
 ('near-names',['1) SYN-IIO 5 mg BD 4 d','2) SYN-110 15 mg HS 3 d'],[('medicine_1','SYN-IIO'),('dose_1','5 mg'),('frequency_1','BD'),('duration_1','4 d'),('medicine_2','SYN-110'),('dose_2','15 mg'),('frequency_2','HS'),('duration_2','3 d')]),
 ('split-lines',['1) SYN-A','200 mg','1-0-1','5 d'],[('medicine_1','SYN-A'),('dose_1','200 mg'),('frequency_1','1-0-1'),('duration_1','5 d')]),
 ('unreadable-name',['1) ?????? 200 mg 1-0-1 5 d'],[('dose_1','200 mg'),('frequency_1','1-0-1'),('duration_1','5 d')])]
manifest={'status':'UNRUN: no reader/model calls','limits':'Font-rendered structural fixtures, not genuine messy handwriting or clinical validation. Expected fields fixed before rendering, not produced by a model. All medicines and pages fictional.','font':'DejaVu Sans Oblique, local font licence copied alongside files','cases':[]}
for id,lines,pairs in cases:
 img=Image.new('RGB',(1200,850),'white');d=ImageDraw.Draw(img);d.text((35,25),'SYNTHETIC TEST ONLY - NOT MEDICAL ADVICE',font=ImageFont.truetype(font,24),fill='#a00000')
 for i,line in enumerate(lines):d.text((65,130+i*105),line,font=ImageFont.truetype(font,38),fill='black')
 p=root/(id+'.png');img.save(p)
 manifest['cases'].append({'id':id,'image':p.name,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'source_lines':lines,'expected':[{'name':n,'value':v} for n,v in pairs]})
(root/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
