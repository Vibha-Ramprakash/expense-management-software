"use client";

import { AlertTriangle, ArrowRight, Camera, CheckCircle2, FileText, Loader2, ScanLine, ShieldCheck, UploadCloud } from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import business from "@/config/business.json";
import { decimalToMinorUnits, formatMinorUnits, formatMoney } from "@/lib/finance.mjs";
import { readJsonResponse } from "@/lib/http-response.mjs";

type Extraction = { merchant:string|null;expenseDate:string|null;amount:string|null;currency:string|null;category:string|null;currencyMismatch:boolean;warnings:string[] };
type Draft = { id:string;merchant:string;expense_date:string;amount_minor:number;currency:string;category:string;memo:string;receipt_key:string|null;receipt_name:string|null;updated_at:string };
type Candidate = { id:string;merchant:string;expense_date:string;amount_minor:number;currency:string;status:string };
type PolicyCategory = { name:string;limitMinor:number };
type Fields = { merchant:string;expenseDate:string;amount:string;currency:string;category:string };
const blankFields:Fields={merchant:"",expenseDate:"",amount:"",currency:business.defaultCurrency,category:""};
function normalizedMerchant(value:string){return value.trim().toLocaleLowerCase("en").replace(/\s+/g," ")}
function formatDate(value:string){return new Intl.DateTimeFormat("en-GB",{day:"numeric",month:"short",year:"numeric"}).format(new Date(`${value}T12:00:00Z`))}

export function ReceiptForm({onSubmit,submitting,draft,duplicateCandidates,policyCategories}:{onSubmit:(form:FormData)=>Promise<void>;submitting:boolean;draft?:Draft|null;duplicateCandidates:Candidate[];policyCategories:PolicyCategory[]}){
  const initialFields=useMemo<Fields>(()=>draft?{merchant:draft.merchant,expenseDate:draft.expense_date,amount:formatMinorUnits(draft.amount_minor),currency:draft.currency,category:draft.category}:blankFields,[draft]);
  const [file,setFile]=useState<File|null>(null);
  const [previewUrl,setPreviewUrl]=useState("");
  const [fields,setFields]=useState<Fields>(initialFields);
  const [consent,setConsent]=useState(false);
  const [reading,setReading]=useState(false);
  const [extraction,setExtraction]=useState<Extraction|null>(null);
  const [reviewed,setReviewed]=useState(false);
  const [duplicateAcknowledged,setDuplicateAcknowledged]=useState(false);
  const [error,setError]=useState("");
  const request=useRef<AbortController|null>(null);
  const lastSelection=useRef("");
  const previewObject=useRef("");

  useEffect(()=>()=>{request.current?.abort();if(previewObject.current)URL.revokeObjectURL(previewObject.current)},[]);

  function chooseFile(next:File|null){request.current?.abort();request.current=null;if(previewObject.current)URL.revokeObjectURL(previewObject.current);previewObject.current=next?URL.createObjectURL(next):"";setPreviewUrl(previewObject.current);lastSelection.current="";setReading(false);setFile(next);if(extraction)setFields(initialFields);setConsent(false);setExtraction(null);setReviewed(false);setDuplicateAcknowledged(false);setError("")}

  useEffect(()=>{
    if(!file||!consent)return;
    const fingerprint=`${file.name}:${file.size}:${file.lastModified}`;
    if(lastSelection.current===fingerprint)return;
    lastSelection.current=fingerprint;
    request.current?.abort();
    const controller=new AbortController();request.current=controller;setReading(true);setReviewed(false);setError("");
    const form=new FormData();form.set("receipt",file);form.set("consent","yes");
    fetch("/api/receipts/extract",{method:"POST",body:form,signal:controller.signal,headers:{"x-keel-ai-request":"1"}})
      .then(async response=>{const payload=await readJsonResponse(response,{fallback:"The receipt reader returned an unexpected response. Please try again.",tooLarge:"This receipt could not be uploaded. Choose a file up to 8 MB."}) as {extraction?:Extraction;error?:string};if(!response.ok||!payload.extraction)throw new Error(payload.error??"Unable to extract receipt details.");return payload.extraction})
      .then(result=>{if(controller.signal.aborted||request.current!==controller)return;setExtraction(result);setFields({merchant:result.merchant??"",expenseDate:result.expenseDate??"",amount:result.amount??"",currency:result.currency??business.defaultCurrency,category:result.category??""})})
      .catch(reason=>{if(!controller.signal.aborted){lastSelection.current="";setError(reason instanceof Error?reason.message:"Unable to extract receipt details.")}})
      .finally(()=>{if(request.current===controller){setReading(false);request.current=null}});
    return()=>controller.abort();
  },[file,consent]);

  const amountMinor=useMemo(()=>{try{return fields.amount?Number(decimalToMinorUnits(fields.amount)):null}catch{return null}},[fields.amount]);
  const policy=policyCategories.find(item=>item.name===fields.category);
  const overLimit=amountMinor!==null&&policy?amountMinor>policy.limitMinor:false;
  const duplicate=useMemo(()=>duplicateCandidates.find(candidate=>candidate.id!==draft?.id&&normalizedMerchant(candidate.merchant)===normalizedMerchant(fields.merchant)&&candidate.expense_date===fields.expenseDate&&candidate.amount_minor===amountMinor&&candidate.currency===fields.currency),[duplicateCandidates,draft?.id,fields.merchant,fields.expenseDate,fields.currency,amountMinor]);
  const currencyMismatch=fields.currency!==business.defaultCurrency;

  function updateField(name:keyof Fields,value:string){setFields(current=>({...current,[name]:value}));setReviewed(false);setDuplicateAcknowledged(false)}
  async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();const submitter=(event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement|null;const intent=submitter?.value==="draft"?"draft":"submit";if(reading||submitting)return;setError("");try{if(intent==="submit"){if(!file&&!draft?.receipt_key)throw new Error("Choose a receipt before submitting, or save a draft while you find it.");if(currencyMismatch)throw new Error(`This workspace records ${business.defaultCurrency}. Correct the currency and amount manually; Keel never converts money.`);if(extraction&&!reviewed)throw new Error("Confirm that you checked the extracted receipt details.");if(duplicate&&!duplicateAcknowledged)throw new Error("Acknowledge the possible duplicate before submitting.")}const element=event.currentTarget;const form=new FormData(element);form.set("intent",intent);form.set("currency",fields.currency);if(draft)form.set("expectedUpdatedAt",draft.updated_at);await onSubmit(form);element.reset();chooseFile(null)}catch(reason){setError(reason instanceof Error?reason.message:"Unable to save this expense.")}}

  return <form className="expense-form" onSubmit={submit}>
    <header className="expense-form-header"><span className="eyebrow">Employee expense</span><h2 id="receipt-form-title">{draft?"Complete expense":"Add expense"}</h2><p>Attach a receipt, let Keel read the facts, then confirm every field before submission. Business purpose always stays manual.</p></header>
    <div className="expense-form-layout">
      <section className="receipt-review-pane" aria-label="Receipt review">
        <details className="receipt-preview" open><summary>Receipt preview</summary><div className="receipt-preview-stage">{previewUrl&&file?.type.startsWith("image/")?<>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="Selected receipt preview"/>
        </>:previewUrl&&file?.type==="application/pdf"?<object data={previewUrl} type="application/pdf" aria-label="Selected receipt PDF"><FileText size={34}/><span>PDF selected</span></object>:draft?.receipt_key?<><FileText size={34}/><span>{draft.receipt_name??"Receipt attached"}</span><a href={`/api/receipts/${draft.receipt_key.replace("receipts/","")}`} target="_blank" rel="noreferrer">Open current receipt</a></>:<><Camera size={34}/><strong>Photograph or choose a receipt</strong><span>The original stays available while you review extracted details.</span></>}</div></details>
        <label className="upload-zone"><UploadCloud size={25}/><span><strong>{file?.name??(draft?.receipt_key?"Replace attached receipt":"Choose receipt or camera")}</strong><small>PDF, JPEG, PNG or WebP · up to 8 MB</small></span><input aria-label="Receipt file or camera" name="receipt" type="file" capture="environment" accept="application/pdf,image/jpeg,image/png,image/webp" disabled={submitting} onChange={event=>chooseFile(event.target.files?.[0]??null)}/></label>
        <div className="extraction-box"><label className="receipt-check"><input type="checkbox" checked={consent} disabled={!file||reading||submitting} onChange={event=>setConsent(event.target.checked)}/><span>Send this receipt to OpenAI to extract its details. It may contain personal or payment information. AI usage is billed to your connected account.</span></label><div className="extraction-state" aria-live="polite">{reading?<><Loader2 size={17} className="spin"/><span>Reading receipt automatically…</span></>:extraction?<><CheckCircle2 size={17}/><span>Receipt read. Confirm the suggestions.</span></>:<><ScanLine size={17}/><span>{file?"Consent starts extraction automatically.":"Choose a receipt to enable extraction."}</span></>}</div><p className="extraction-hint">Manual entry and draft saving remain available without an AI connection.</p></div>
      </section>
      <section className="receipt-fields-pane">
        {error&&<p className="receipt-error" role="alert">{error}</p>}
        {extraction&&<div className="extraction-result" role="status"><strong>Extracted suggestions</strong><p>Receipt currency: {extraction.currency??"not confidently identified"}. No claim has been submitted.</p>{extraction.warnings.length>0&&<ul>{extraction.warnings.map((warning,index)=><li key={index}>{warning}</li>)}</ul>}</div>}
        <fieldset className="receipt-fields" disabled={reading||submitting}><legend className="sr-only">Confirm receipt details</legend><div className="form-grid"><label><span>Merchant</span><input name="merchant" placeholder="e.g. Alpine Rail" value={fields.merchant} onChange={event=>updateField("merchant",event.target.value)} required/></label><label><span>Expense date</span><input name="expenseDate" type="date" value={fields.expenseDate} onChange={event=>updateField("expenseDate",event.target.value)} required/></label><label><span>Amount</span><input name="amount" inputMode="decimal" placeholder="0.00" pattern="[0-9]+([.][0-9]{1,2})?" value={fields.amount} onChange={event=>updateField("amount",event.target.value)} required/></label><label><span>Currency</span><select name="currency" value={fields.currency} onChange={event=>updateField("currency",event.target.value)}>{Array.from(new Set([business.defaultCurrency,fields.currency].filter(Boolean))).map(currency=><option key={currency}>{currency}</option>)}</select></label><label className="full-field"><span>Category</span><select name="category" value={fields.category} onChange={event=>updateField("category",event.target.value)} required><option value="" disabled>Choose category</option>{policyCategories.map(category=><option key={category.name}>{category.name}</option>)}</select></label><label className="full-field"><span>Business purpose</span><textarea name="memo" rows={3} placeholder="What was this expense for?" defaultValue={draft?.memo??""} required/></label></div></fieldset>
        {policy&&amountMinor!==null&&<div className={`live-policy ${overLimit?"live-policy-over":""}`}><ShieldCheck size={17}/><div><strong>{overLimit?"Above configured limit":"Within configured limit"}</strong><span>{fields.category}: {formatMoney(amountMinor,business.defaultCurrency)} against {formatMoney(policy.limitMinor,business.defaultCurrency)} per claim.</span></div></div>}
        {currencyMismatch&&<div className="duplicate-warning"><AlertTriangle size={17}/><div><strong>Foreign currency detected</strong><p>Keel will not guess an exchange rate or convert the amount. Choose {business.defaultCurrency} only after manually confirming the correct claim amount.</p></div></div>}
        {duplicate&&<div className="duplicate-warning"><AlertTriangle size={17}/><div><strong>Possible exact duplicate</strong><p>{duplicate.merchant}, {formatDate(duplicate.expense_date)}, {formatMoney(duplicate.amount_minor,duplicate.currency)} already exists as {duplicate.status}.</p><label className="receipt-check"><input type="checkbox" checked={duplicateAcknowledged} onChange={event=>setDuplicateAcknowledged(event.target.checked)}/><span>I checked this is a separate expense.</span></label></div></div>}
        {extraction&&<label className="receipt-check review-check"><input type="checkbox" checked={reviewed} onChange={event=>setReviewed(event.target.checked)} disabled={reading||submitting||currencyMismatch}/><span>I checked the original receipt, including total, currency and date, and corrected any mistakes.</span></label>}
        <div className="form-note"><ShieldCheck size={17}/><span>AI suggestions never approve an expense or move money. Category limits and approval rules still apply.</span></div>
      </section>
    </div>
    <div className="receipt-submit-actions"><button className="secondary-button" name="intent" value="draft" type="submit" formNoValidate disabled={submitting||reading}>Save draft</button><button className="primary-button" name="intent" value="submit" type="submit" disabled={submitting||reading||currencyMismatch||Boolean(extraction&&!reviewed)||Boolean(duplicate&&!duplicateAcknowledged)}>{submitting?<Loader2 className="spin" size={17}/>:<ArrowRight size={17}/>}Submit for review</button></div>
  </form>
}
