/* A campanha usa as regras de 2014. Dados 2024 já baixados são preservados, mas ficam fora das consultas. */
window.EDICOES = Object.freeze({
  padrao: "2014",
  catalogo2014(registro){
    if(registro?.custom)return true;
    const d=registro?.document||registro||{},fonte=[d.key,d.name,d.display_name].filter(Boolean).join(' ');
    return /(?:srd[-_ ]?2014|admin[-_ ]?2014|5e 2014 Rules)/i.test(fonte)&&!/(?:2024|srd[\s-]*5[._]2)/i.test(fonte);
  },
  permitida(registro) {
    if (registro?.custom) return true;
    const doc = registro?.document || registro || {};
    const fonte = [registro?.e, doc.key, doc.name, doc.display_name].filter(Boolean).join(" ");
    return !/(?:2024|srd[\s-]*5[._]2)/i.test(fonte);
  }
});
