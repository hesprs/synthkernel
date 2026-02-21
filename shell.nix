let
  pkgs = import <nixpkgs> { };
in
pkgs.mkShell {
  buildInputs = with pkgs; [
    deno
    python3
    jupyter
  ];

  shellHook = ''
    echo "🔗 Registering Deno kernel..."
    deno jupyter

    echo "✅ Environment ready!"
  '';
}
