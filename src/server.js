require('dotenv').config();
const express=require('express');const cors=require('cors');const {analyze}=require('./copilot');const {draftPartnerProfile}=require('./partner-profile');
const app=express();const origins=(process.env.ALLOWED_ORIGINS||'*').split(',').map(x=>x.trim());app.use(cors({origin:origins.includes('*')?true:origins}));app.use(express.json({limit:'2mb'}));
app.get('/healthz',(_req,res)=>res.json({ok:true,service:'drix-linkedin-copilot',tde_configured:!!process.env.TDE_BASE_URL,llm_configured:!!process.env.OPENROUTER_API_KEY}));
app.post('/api/copilot/analyze',async(req,res)=>{try{res.json(await analyze(req.body))}catch(e){console.error('[copilot]',e.message);res.status(e.status||502).json({error:e.message})}});
app.post('/api/copilot/partner-profile',async(req,res)=>{try{res.json(await draftPartnerProfile(req.body))}catch(e){console.error('[partner-profile]',e.message);res.status(e.status||502).json({error:e.message})}});
if(require.main===module){const port=Number(process.env.PORT||8410);app.listen(port,'0.0.0.0',()=>console.log(`[drix-linkedin-copilot] http://localhost:${port}`))}module.exports=app;
