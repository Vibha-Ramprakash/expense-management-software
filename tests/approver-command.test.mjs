import test from "node:test";
import assert from "node:assert/strict";
import { matchingSubmittedClaims, validateApproverPlan } from "../lib/approver-command.mjs";

const context={categories:["Travel","Meals"],defaultCurrency:"EUR"};
const expenses=[
  {id:"a",status:"submitted",submitter_id:"employee",category:"Travel",currency:"EUR",amount_minor:8640},
  {id:"b",status:"submitted",submitter_id:"employee",category:"Travel",currency:"EUR",amount_minor:10000},
  {id:"c",status:"approved",submitter_id:"employee",category:"Travel",currency:"EUR",amount_minor:4200},
  {id:"d",status:"submitted",submitter_id:"approver",category:"Travel",currency:"EUR",amount_minor:4200},
  {id:"e",status:"submitted",submitter_id:"employee",category:"Meals",currency:"EUR",amount_minor:4200},
];

test("a preview rule matches only submitted, non-self claims in one category and currency",()=>{
  const plan=validateApproverPlan({kind:"approve_matching",category:"Travel",currency:"EUR",amount:"100.00",comparison:"below"},context);
  assert.deepEqual(matchingSubmittedClaims(expenses,plan,"approver").map(item=>item.id),["a"]);
  assert.deepEqual(matchingSubmittedClaims(expenses,{...plan,comparison:"at_or_below"},"approver").map(item=>item.id),["a","b"]);
});

test("policy commands cannot use a foreign currency or conceal another action",()=>{
  assert.throws(()=>validateApproverPlan({kind:"set_limit",category:"Travel",currency:"CHF",amount:"100.00",comparison:"none"},context),/must use EUR/);
  assert.throws(()=>validateApproverPlan({kind:"approve_matching",category:"Travel",currency:"EUR",amount:"100.00",comparison:"none"},context),/below or at-or-below/);
  assert.equal(validateApproverPlan({kind:"unsupported",category:null,currency:null,amount:null,comparison:"none"},context).kind,"unsupported");
});
