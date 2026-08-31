import business from "@/config/business.json";
import { assertConfiguredApprover, decimalToMinorUnits } from "@/lib/finance.mjs";
import { demoAccessDenial } from "@/lib/demo-access.mjs";
import { setPolicyLimit } from "@/lib/store";

export const dynamic = "force-dynamic";
export async function PATCH(request:Request) {
  const denied=demoAccessDenial(request,process.env.NODE_ENV==="development");if(denied)return denied;
  try {
    const body=await request.json() as {category?:string;amount?:string;actorId?:string;actorName?:string};
    if(!body.actorId||!body.actorName)throw new Error("Choose the Approver demo role.");
    assertConfiguredApprover({actorId:body.actorId,actorName:body.actorName,approvers:business.approvers});
    const limitMinor=decimalToMinorUnits(body.amount);
    const settings=await setPolicyLimit({category:String(body.category??""),limitMinor,actorId:body.actorId,actorName:body.actorName,note:`Direct policy update: ${body.category} set to ${body.amount} ${business.defaultCurrency}`});
    return Response.json({policy:{currency:settings.defaultCurrency,categories:settings.categories}},{headers:{"Cache-Control":"no-store"}});
  } catch(error){return Response.json({error:error instanceof Error?error.message:"Unable to update the policy limit."},{status:400});}
}
