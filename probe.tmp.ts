import { encode } from "next-auth/jwt";
import fs from "node:fs";

const secret = /^AUTH_SECRET="?([^"\n]*)/m.exec(fs.readFileSync(".env","utf8"))![1].trim();
const nombre = "authjs.session-token";

(async () => {
  const token = await encode({
    token: { sub: "cmsv0c52k0000qhu8d44msoxo" },
    secret,
    salt: nombre,
    maxAge: 3600,
  });
  console.log(nombre + "=" + token);
})();
