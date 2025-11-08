with import <nixpkgs> { };
let
  unstable = import <unstable> { };
in
mkShell {
  buildInputs = [
    nodejs
    nodePackages.pnpm
    unstable.postgresql
    unstable.openssl
    nodePackages.vercel
  ];
  shellHook = ''
    export NODE_OPTIONS=--max_old_space_size=4096
    PATH="$PWD/node_modules/.bin:$PATH"
  '';

  PRISMA_SCHEMA_ENGINE_BINARY = "${prisma-engines}/bin/schema-engine";
  PRISMA_QUERY_ENGINE_BINARY = "${prisma-engines}/bin/query-engine";
  PRISMA_QUERY_ENGINE_LIBRARY = "${prisma-engines}/lib/libquery_engine.node";
  PRISMA_INTROSPECTION_ENGINE_BINARY = "${prisma-engines}/bin/introspection-engine";
  PRISMA_FMT_BINARY = "${prisma-engines}/bin/prisma-fmt";
}
