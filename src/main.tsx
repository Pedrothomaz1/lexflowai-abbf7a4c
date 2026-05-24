import React from "react";
import { createRoot } from "react-dom/client";

createRoot(document.getElementById("root")!).render(
  <div style={{ fontFamily: "system-ui", padding: 40, maxWidth: 720, margin: "60px auto", lineHeight: 1.6 }}>
    <h1 style={{ color: "#b91c1c" }}>⚠️ Código do LexFlow não está neste repositório</h1>
    <p>
      O sync com a branch <code>main</code> do GitHub trouxe um repositório quase vazio
      (template AIOX), e não o app LexFlow. Faltam: <code>App.tsx</code>, <code>main.tsx</code>,
      <code>src/components/ui/</code>, todas as páginas e features.
    </p>
    <p>
      <strong>Restaure pela History do Lovable</strong> a versão anterior ao último sync com GitHub.
    </p>
  </div>
);
