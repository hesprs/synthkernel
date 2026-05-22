let
  pkgs = import <nixpkgs> { };
in
pkgs.mkShell {
  buildInputs = with pkgs; [
    nodejs-slim_latest
    pnpm
    python3
    python314Packages.jupyterlab
  ];

  shellHook = ''
    export JUPYTER_DATA_DIR="$(pwd)/.jupyter/data"
    export JUPYTER_CONFIG_DIR="$(pwd)/.jupyter/config"
    export TSLAB_RUNTIME_DIR="$(pwd)/node_modules/.bin/tslab"
    mkdir -p "$JUPYTER_DATA_DIR/kernels/tslab"
    mkdir -p "$JUPYTER_DATA_DIR/kernels/jslab"

    cat > "$JUPYTER_DATA_DIR/kernels/tslab/kernel.json" <<EOF
    {
      "argv": ["$TSLAB_RUNTIME_DIR", "kernel", "--config-path", "{connection_file}"],
      "display_name": "TypeScript",
      "language": "typescript"
    }
    EOF

    cat > "$JUPYTER_DATA_DIR/kernels/jslab/kernel.json" <<EOF
    {
      "argv": ["$TSLAB_RUNTIME_DIR", "kernel", "--config-path", "{connection_file}", "--js"],
      "display_name": "JavaScript",
      "language": "javascript"
    }
    EOF

    cat > "$JUPYTER_CONFIG_DIR/jupyter_server_config.py" << EOF
    c.FileCheckpoints.checkpoint_dir = ".jupyter/checkpoints"
    EOF
  '';
}
