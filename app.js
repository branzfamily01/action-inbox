
import * as pdfjsLib from 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs';
pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs';

const $=s=>document.querySelector(s);
const sample=`【重要】健康診断の申込について
今年度の健康診断を10月15日（水）に実施します。
受診を希望する方は、9月30日までに添付の申込フォームから回答してください。
自己負担金は3,500円です。当日は本人確認書類をご持参ください。
変更・キャンセルは総務部（03-1234-5678）までご連絡ください。
期限までに回答がない場合、今年度の受診枠を確保できない場合があります。`;

function setStatus(msg){
  $("#status").textContent=msg;
  $("#status").classList.remove("hidden");
}
function hideStatus(){ $("#status").classList.add("hidden"); }

$("#sampleBtn").onclick=()=>{$("#sourceText").value=sample; hideStatus();};

async function readPdf(file){
  const buf=await file.arrayBuffer();
  const pdf=await pdfjsLib.getDocument({data:buf}).promise;
  let all="";
  for(let i=1;i<=pdf.numPages;i++){
    setStatus(`PDFを読み取り中… ${i}/${pdf.numPages}ページ`);
    const page=await pdf.getPage(i);
    const content=await page.getTextContent();
    all += content.items.map(x=>x.str).join(" ") + "\n";
  }
  return all.trim();
}

async function readImage(file){
  if(!window.Tesseract) throw new Error("OCRライブラリを読み込めませんでした");
  setStatus("画像から文字を読み取り中… しばらくお待ちください");
  const result=await Tesseract.recognize(file,'jpn+eng',{
    logger:m=>{
      if(m.status==="recognizing text"){
        setStatus(`画像から文字を読み取り中… ${Math.round((m.progress||0)*100)}%`);
      }
    }
  });
  return result.data.text.trim();
}

$("#fileInput").onchange=async e=>{
 const f=e.target.files[0]; if(!f)return;
 $("#fileName").textContent=f.name;
 try{
   let text="";
   if(f.type==="application/pdf" || /\.pdf$/i.test(f.name)){
      text=await readPdf(f);
   }else if(f.type.startsWith("image/")){
      text=await readImage(f);
   }else{
      setStatus("ファイルを読み込み中…");
      text=await f.text();
   }
   if(!text) throw new Error("文字を抽出できませんでした");
   $("#sourceText").value=text;
   setStatus("読み取り完了。「やることに変換」を押してください。");
 }catch(err){
   console.error(err);
   setStatus("読み取りに失敗しました。画像の場合は明るく正面から撮影し、PDFの場合は文字入りPDFをお試しください。");
 }
};

function uniq(a){return [...new Set(a)].filter(Boolean)}
function extract(text){
 const dates=uniq(text.match(/(?:\d{4}年)?\d{1,2}月\d{1,2}日(?:\s*[（(][^)）]+[)）])?|(?:\d{4}[\/.-])?\d{1,2}[\/.-]\d{1,2}/g)||[]);
 const money=uniq(text.match(/[¥￥]?\s?\d{1,3}(?:,\d{3})*(?:円|万円|千円)/g)||[]);
 const phones=uniq(text.match(/0\d{1,4}-\d{1,4}-\d{3,4}/g)||[]);
 const emails=uniq(text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)||[]);
 const deadline=/期限|までに|締切|締め切り|回答|申込|申し込|提出/.test(text);
 const payment=/支払|振込|請求|料金|負担金|円/.test(text);
 const bring=/持参|持ち物|必要書類|本人確認/.test(text);
 const contact=/連絡|問い合わせ|キャンセル|変更/.test(text);
 let actions=[];
 if(deadline) actions.push(["期限までに必要な回答・申込をする", dates[0] ? `目安の期限：${dates[0]}`:"文書内の期限を確認"]);
 if(payment) actions.push(["支払い・費用条件を確認する", money[0]||"金額・支払方法を確認"]);
 if(bring) actions.push(["当日の持ち物を準備する","必要書類・本人確認書類など"]);
 if(contact) actions.push(["変更や不明点があれば連絡する", [...phones,...emails][0]||"連絡先を確認"]);
 if(!actions.length) actions.push(["内容を確認し、対応要否を判断する","自動抽出できる明確な指示が見つかりませんでした"]);
 const high=/至急|重要|期限|失効|延滞|停止|できない場合|キャンセル/.test(text);
 const firstLine=text.split(/\n/).map(x=>x.trim()).find(Boolean)||"受信文書";
 return {title:firstLine.replace(/[【】]/g,"").slice(0,40),dates,money,contacts:[...phones,...emails],actions,high};
}

$("#analyzeBtn").onclick=()=>{
 const text=$("#sourceText").value.trim();
 if(!text){ setStatus("先にファイルを読み込むか、文書本文を貼り付けてください。"); return; }
 const d=extract(text);
 $("#docTitle").textContent=d.title;
 $("#summary").textContent=d.actions.length>1?`この文書には、あなたが対応すべき項目が${d.actions.length}件あります。期限・費用・持ち物・連絡の順に処理できます。`:"この文書は、対応が必要かどうかの確認が主なアクションです。";
 $("#actions").innerHTML=d.actions.map((a,i)=>`<label class="action"><input type="checkbox"><span><strong>${i+1}. ${a[0]}</strong><small>${a[1]}</small></span></label>`).join("");
 $("#dates").textContent=d.dates.join(" / ")||"検出なし";
 $("#money").textContent=d.money.join(" / ")||"検出なし";
 $("#contacts").textContent=d.contacts.join(" / ")||"検出なし";
 $("#risk").textContent=d.high?"期限超過・権利失効・手続き漏れなどの可能性があります。該当箇所を優先して確認してください。":"現時点で強い緊急表現は検出されていません。";
 $("#urgencyBadge").textContent=d.high?"要確認":"通常";
 $("#urgencyBadge").className="badge"+(d.high?" high":"");
 $("#result").classList.remove("hidden");
 $("#result").scrollIntoView({behavior:"smooth"});
};

$("#copyBtn").onclick=async()=>{
 const lines=[...document.querySelectorAll(".action strong")].map(x=>"□ "+x.textContent.replace(/^\d+\.\s*/,""));
 try{ await navigator.clipboard.writeText(lines.join("\n")); }
 catch{ alert(lines.join("\n")); return; }
 $("#copyBtn").textContent="コピーしました";
 setTimeout(()=>$("#copyBtn").textContent="アクション一覧をコピー",1400);
};
