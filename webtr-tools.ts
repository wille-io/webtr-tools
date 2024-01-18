/**
 * @file webtr-tools.ts
 * @copyright Mike Wille <mike@wille.io>
 * @license MIT
 */


// TODO: catch `setAttribute("data-tr", ...);`

import * as acorn from "acorn";
import { tr, set } from "webtr";


let trValues: string[] | null;
let trFileContent: string | null = null;


function getElement(id: string): HTMLElement
{
  const elem = document.getElementById(id);

  if (!elem)
  {
    throw new Error(`Element with id '${id}' not found.`);
  }

  return elem;
}


window.addEventListener("DOMContentLoaded", () => 
{
  async function getFileContent(event: Event): Promise<string>
  {
    const eventTarget: EventTarget | null = event.target;

    if (eventTarget === null)
    {
      throw new Error("Key 'target' missing from event!");
    }

    const fileList = (eventTarget as HTMLInputElement).files;

    if (!fileList || fileList.length < 1)
    {
      throw new Error("No files selected!");
    }

    function getFileReader(file: File): Promise<FileReader>
    {
      return new Promise((resolve, reject) => 
      {
        const reader = new FileReader();
        reader.addEventListener("load", (progressEvent) => 
        {
          if (!progressEvent.target)
          {
            throw new Error("No FileReader available!");
          }

          resolve(progressEvent.target);
        });
        reader.addEventListener("error", reject);
        reader.readAsText(file);
      });
    }

    const fileReader = await getFileReader(fileList[0]);

    const content = fileReader.result as string;
    return content;
  }


  getElement("js").addEventListener("change", async (event: Event) =>
  {
    const js = await getFileContent(event);

    // @.ts-expect-error-2304 (html file loads acorn script, can't get tsc to accept the 'acorn' namespace...)
    const ast = acorn.parse(js, { ecmaVersion: "latest" });

    go(ast);

    if (trFileContent)
    {
      goTr();
    }
  });


  // tr.js stuff:
  getElement("tr").addEventListener("change", async (event: Event) => 
  {
    trFileContent = await getFileContent(event);
    goTr();
  });
});


type AstObject = any;


function findObjects(object: AstObject, key: string, value: string): AstObject[]
{
  let result: AstObject[] = [];

  Object.keys(object).forEach((k) =>
  {
    const v = object[k];

    if (k === key && typeof v === "string" && v === value) 
    {
      result.push(object);
      return;
    }

    if (v && typeof v === "object")
    {
      result.push(...findObjects(v, key, value));
    }
  });

  return result;
}


function go(ast: AstObject)
{
  const calls = findObjects(ast, "type", "CallExpression");

  trValues = [];
  for (let call of calls)
  {
    if (call["callee"]["name"] === "tr" && call["arguments"][0]["type"] === "Literal")
    {
      trValues.push(call["arguments"][0]["value"]);
    }
  }

  console.log("trValues", trValues);


  let html = "";

  for (let value of trValues)
    html += `<li>${value}</li>`;

  if (html.length === 0)
    html = "[ No translations used in this js file. ]";
  else 
    html = `Used translatable text(s):<br><ul>${html}</ul>`;


  getElement("content").innerHTML = html;//JSON.stringify(trCalls, null, "  ");
  console.log("done");
}




// tr.js stuff:
function goTr()
{
  try
  {
    _goTr();
  }
  catch(e: unknown)
  {
    console.error(e);
    const errorMessage = (e instanceof Error) ? e.message : "unknown";
    alert(tr("Failed to load tr.js file: ${errorMessage}", { errorMessage }));
    (getElement("tr") as HTMLInputElement).value = "";
  }
}


function _goTr()
{
  if (!trValues)
    throw new Error("Please load a js file first, then try again.");

  if (!trFileContent)
    return;

  //console.log("_tr", _tr);

  let translations: any;
  eval(trFileContent); // evel x_x - should set `translations`

  if (!translations)
    throw new Error("Js script doesn't set the `translations` variable.");

  //console.log("translations", translations);

  if (typeof translations !== "object")
    throw new Error("The tr file's root element needs to be an object.");

  const keys = Object.keys(translations);

  console.log("keys", keys);

  let missingKeys = [];

  console.log("trValues", trValues);
  for (let value of trValues)
  {
    console.log("value", value);
    if (!keys.includes(value))
      missingKeys.push(value);
  }

  if (missingKeys.length === 0)
  {
    getElement("missing").innerText = "[ No missing translations. ]";
    return;
  }

  let html = "Missing translation(s):<br><ul>";

  for (let key of missingKeys)
    html += `<li>${key}</li>`;

  html += "</ul>";

  getElement("missing").innerHTML = html;
}