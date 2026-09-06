export default async function handler(req,res){
  if(req.method!=='POST') return res.status(405).json({error:'POST only'});
  const key=process.env.OPENAI_API_KEY;
  if(!key) return res.status(503).json({error:'AI_NOT_CONFIGURED'});
  const prompt=(req.body&&req.body.prompt||'').trim();
  if(!prompt) return res.status(400).json({error:'Missing prompt'});
  const system=`You generate complete self-contained browser games as a single HTML file. Return ONLY HTML, no markdown fences. The game must be playable on iPhone with large touch controls, responsive layout, no external assets or libraries, and no network calls. Use canvas or DOM, include clear win/lose conditions, restart, and visible controls. Keep the game lightweight and fun. Follow the creator request exactly while preserving safety and usability.`;
  try{
    const r=await fetch('https://api.openai.com/v1/responses',{
      method:'POST',headers:{'Authorization':'Bearer '+key,'Content-Type':'application/json'},
      body:JSON.stringify({model:'gpt-5.6-luna',instructions:system,input:prompt,max_output_tokens:12000})
    });
    const data=await r.json();
    if(!r.ok) return res.status(r.status).json({error:data?.error?.message||'Generation failed'});
    let html='';
    if(typeof data.output_text==='string') html=data.output_text;
    if(!html && Array.isArray(data.output)){
      for(const item of data.output){
        for(const part of (item.content||[])) if(part.type==='output_text'&&part.text) html+=part.text;
      }
    }
    html=html.replace(/^```html\s*/i,'').replace(/```\s*$/,'').trim();
    if(!/^<!doctype html>|^<html/i.test(html)) return res.status(502).json({error:'Model did not return a complete game'});
    res.status(200).json({html});
  }catch(e){res.status(500).json({error:'Generation service error'});}
}
