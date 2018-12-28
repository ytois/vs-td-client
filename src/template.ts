export function jobDetailTemplate(jobJson: any) {
  let html = '';
  Object.keys(jobJson).forEach(key => {
    if (jobJson[key] instanceof Object && !(jobJson[key] instanceof Array)) {
      Object.keys(jobJson[key]).forEach(key2 => {
        html += `<tr><th>${key2}</th><td>${jobJson[key][key2]}</td></tr>`;
      });
    } else {
      html += `<tr><th>${key}</th><td>${jobJson[key]}</td></tr>`;
    }
  });
  return `<table>${html.replace(`\n`, '<br />')}</table>`;
}
