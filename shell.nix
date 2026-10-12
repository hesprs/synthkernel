let
  pkgs = import <nixpkgs> { };
in
pkgs.mkShell {
  buildInputs = with pkgs; [
    bun
    python3
    python314Packages.jupyterlab
  ];

  shellHook = ''
    export JUPYTER_DATA_DIR="$(pwd)/.jupyter/data"
    export JUPYTER_CONFIG_DIR="$(pwd)/.jupyter/config"
    export JUPYTER_BUN_KERNEL="$(pwd)/node_modules/jupyter-bun/dist/index.js"
    mkdir -p "$JUPYTER_DATA_DIR/kernels/typescript-bun"

    cat > "$JUPYTER_DATA_DIR/kernels/typescript-bun/kernel.json" <<EOF
    {
      "argv": ["bun", "$JUPYTER_BUN_KERNEL", "{connection_file}"],
      "display_name": "TypeScript (Bun)",
      "language": "typescript"
    }
    EOF

    cat > "$JUPYTER_CONFIG_DIR/jupyter_server_config.py" << EOF
    c.FileCheckpoints.checkpoint_dir = ".jupyter/checkpoints"
    EOF
  '';
}
