let
  pkgs = import <nixpkgs> { };
in
pkgs.mkShell {
  nativeBuildInputs = with pkgs; [
    pkg-config
  ];

  buildInputs = with pkgs; [
    nodePackages_latest.nodejs
    pnpm
    python3
    jupyter
  ];

  shellHook = ''
    echo "🚀 Loading TypeScript Jupyter Environment (pnpm)..."

    # Set a local directory for global pnpm packages to keep your user profile clean
    export PNPM_HOME="$PWD/.pnpm-global"
    export PATH="$PNPM_HOME/bin:$PATH"

    # Install tslab if not already present in this local global path
    if ! command -v tslab &> /dev/null; then
      echo "📦 Installing tslab via pnpm..."
      pnpm add -g tslab
    fi

    echo "🔗 Registering TypeScript kernel..."
    tslab install

    echo "✅ Environment ready!"
    echo "   - Run 'jupyter lab' to start the UI."
    echo "   - Run 'code .' to open VS Code with kernel detection."
  '';
}
