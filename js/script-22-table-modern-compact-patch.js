(function(){
  function tableDensityVars(mod){
    const density = mod.tableDensity || "normal";

    const sizes = {
      compact: {
        gap: 2,
        padY: 3,
        padX: 5,
        minW: 34,
        h: 22,
        radius: 6,
        font: ".74rem"
      },
      normal: {
        gap: 4,
        padY: 7,
        padX: 9,
        minW: 56,
        h: 30,
        radius: 9,
        font: ".92rem"
      },
      large: {
        gap: 6,
        padY: 10,
        padX: 13,
        minW: 76,
        h: 42,
        radius: 13,
        font: "1.05rem"
      }
    };

    const s = sizes[density] || sizes.normal;

    return [
      "--table-gap:" + s.gap + "px",
      "--cell-pad-y:" + s.padY + "px",
      "--cell-pad-x:" + s.padX + "px",
      "--cell-min-w:" + s.minW + "px",
      "--cell-h:" + s.h + "px",
      "--cell-radius:" + s.radius + "px",
      "--table-font:" + s.font
    ].join(";");
  }

  if(typeof tableHTML === "function"){
    const oldTableHTMLModernPatch = tableHTML;

    tableHTML = function(mod){
      normalizeMerges(mod);
      const rows = mod.rows || [];

      return `
        <div class="content table-modern-wrap" style="${tableDensityVars(mod)}">
          <table class="status-table-modern">
            <tbody>
              ${rows.map((row,r)=>`
                <tr>
                  ${row.map((cell,c)=>{
                    if(isHiddenMergedCell(mod,r,c)) return "";

                    const raw = String(cell ?? "");
                    const merge = getMergeAt(mod,r,c);

                    const classes = [
                      isSelectedCell(mod.id,r,c) ? "cell-selected" : "",
                      isMultiSelectedCell(mod.id,r,c) ? "cell-multi-selected" : "",
                      merge ? "cell-merged" : ""
                    ].filter(Boolean).join(" ");

                    const spanAttrs = merge
                      ? `${merge.rowspan > 1 ? ` rowspan="${merge.rowspan}"` : ""}${merge.colspan > 1 ? ` colspan="${merge.colspan}"` : ""}`
                      : "";

                    return `
                      <td data-row="${r}" data-col="${c}"${spanAttrs} class="${classes}" style="${cellStyleCSS(mod,r,c)}">
                        <div class="cell-display">${formatTextHTML(raw)}</div>
                        <textarea class="cell-editor" data-row="${r}" data-col="${c}" rows="1">${escapeHTML(raw)}</textarea>
                      </td>
                    `;
                  }).join("")}
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      `;
    };
  }

  if(typeof settingsSpecific === "function"){
    const oldSettingsSpecificTableModernPatch = settingsSpecific;

    settingsSpecific = function(mod){
      let html = oldSettingsSpecificTableModernPatch(mod);

      if(!mod || mod.type !== "table") return html;

      const density = mod.tableDensity || "normal";

      const densityHTML = `
        <div class="field">
          <label>Cellestørrelse</label>
          <div class="table-density-buttons">
            <button id="tableDensityCompact" class="tool-btn ${density === "compact" ? "active" : ""}" type="button">Kompakt</button>
            <button id="tableDensityNormal" class="tool-btn ${density === "normal" ? "active" : ""}" type="button">Normal</button>
            <button id="tableDensityLarge" class="tool-btn ${density === "large" ? "active" : ""}" type="button">Stor</button>
          </div>
        </div>
      `;

      return densityHTML + html;
    };
  }

  if(typeof renderSelectedSettings === "function"){
    const oldRenderSelectedSettingsTableModernPatch = renderSelectedSettings;

    renderSelectedSettings = function(){
      oldRenderSelectedSettingsTableModernPatch();

      let mod = null;
      try{ mod = selected && selected(); }catch(e){}

      if(!mod || mod.type !== "table") return;

      const setDensity = value => {
        mod.tableDensity = value;
        save();
        renderAll();
      };

      document.getElementById("tableDensityCompact")?.addEventListener("click", () => setDensity("compact"));
      document.getElementById("tableDensityNormal")?.addEventListener("click", () => setDensity("normal"));
      document.getElementById("tableDensityLarge")?.addEventListener("click", () => setDensity("large"));
    };
  }

  if(typeof renderAll === "function"){
    try{ renderAll(); }catch(e){ console.error("table modern compact patch failed", e); }
  }
})();
