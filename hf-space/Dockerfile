FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl git libicu-dev libopenblas-dev uuid-dev build-essential && rm -rf /var/lib/apt/lists/*
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user PATH=/home/user/.jolt-dist:$PATH OPENBLAS_NUM_THREADS=2
WORKDIR /home/user
RUN curl -fsSL -o /tmp/jolt.tar.gz https://github.com/jolt-lang/jolt/releases/download/v0.8.12/jolt-v0.8.12-x86_64-linux.tar.gz && mkdir .jolt-dist && tar xzf /tmp/jolt.tar.gz -C .jolt-dist --strip-components=1
RUN git clone --depth 1 --branch v0.2.0 https://github.com/jlt-commons/lev lev
WORKDIR /home/user/lev
RUN jolt kernels
RUN mkdir -p /home/user/laya/tokenizer /home/user/laya/encoder && for f in model.safetensors tokenizer/tokenizer.json tokenizer/tokenizer_config.json encoder/config.json rl_agent_config.json; do curl -fsSL -o /home/user/laya/$f https://huggingface.co/convaiinnovations/laya/resolve/c5d78730f3493e4fe16d61507ef4b78eef7318cf/$f; done && echo '891102d372688fc2a094dac56a384bc537b87c63f21f9f3dac0be2b7cbc8d86c  /home/user/laya/model.safetensors' | sha256sum -c -
RUN LEV_CHECKPOINTS=/home/user/laya jolt prepare
ENV LEV_HOST=0.0.0.0 PORT=7860 LEV_MAX_LOADED=1 LEV_DEFAULT_MODEL=english
EXPOSE 7860
CMD ["jolt", "-M:serve", "--host", "0.0.0.0", "--port", "7860"]
