let
  pkgs = import <nixpkgs> { };
in
pkgs.mkShell {
  buildInputs = with pkgs; [
    nodePackages_latest.nodejs
    python3
    jupyter
  ];

  shellHook = ''
    echo "🚀 Loading TypeScript Jupyter Environment (npm local-global)..."

    # Define local global directory
    export NPM_GLOBAL_DIR="$PWD/.npm-global"

    # Configure npm for this session only
    npm config set prefix "$NPM_GLOBAL_DIR"

    # Add binaries to PATH
    export PATH="$NPM_GLOBAL_DIR/bin:$PATH"

    # Install tslab if missing
    if ! command -v tslab &> /dev/null; then
      echo "📦 Installing tslab via npm (local global)..."
      npm install -g tslab
    fi

    echo "🔗 Registering TypeScript kernel..."
    tslab install

    echo "✅ Environment ready!"
  '';
}
