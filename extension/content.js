function firstText(selectors,root=document){for(const selector of selectors){const text=root.querySelector(selector)?.innerText?.trim();if(text)return text}return''}
function activeMessageRoot(){return document.querySelector('.msg-overlay-conversation-bubble--is-active')||document.querySelector('.msg-overlay-conversation-bubble')||document.querySelector('.msg-thread')||document.querySelector('main .msg-s-message-list-container')}
function detectPageType(){
  const path=location.pathname.toLowerCase();
  if(path.startsWith('/messaging/'))return'messaging';
  if(path.startsWith('/company/')||path.includes('/sales/company/')||document.querySelector('.org-top-card,.org-top-card-summary,.org-page-details-module'))return'company';
  if(path.startsWith('/in/')||path.includes('/sales/lead/')||document.querySelector('.pv-top-card,.profile-topcard'))return'profile';
  const h1=firstText(['main h1','[role="main"] h1']);
  if(h1&&document.querySelector('a[href*="/company/"],a[href*="/sales/company/"]'))return'company';
  return'unsupported';
}
function externalLinks(){return[...document.querySelectorAll('main a[href],[role="main"] a[href]')].map(a=>a.href).filter(href=>/^https?:/i.test(href)&&!/(^|\.)linkedin\.com/i.test(new URL(href).hostname)).filter((href,i,all)=>all.indexOf(href)===i).slice(0,12)}
function captureThread(){
  const root=activeMessageRoot()||(location.pathname.startsWith('/messaging/')?(document.querySelector('main')||document):null);if(!root)return[];
  const selectors=['.msg-s-message-list__event','.msg-s-event-listitem','[data-view-name="message-list-item"]','li.msg-s-message-list__event'];
  let nodes=[...root.querySelectorAll(selectors.join(','))];
  if(!nodes.length)nodes=[...root.querySelectorAll('[class*="message"]')].filter(n=>n.querySelector('p,[class*="body"],[class*="bubble"]'));
  return nodes.map(node=>({sender:firstText(['.msg-s-message-group__name','.msg-s-event-listitem__name','[data-anonymize="person-name"]','h3'],node),text:firstText(['.msg-s-event-listitem__body','.msg-s-message-group__messages','.msg-s-event-listitem__message-bubble','p'],node),timestamp:firstText(['time','.msg-s-message-group__timestamp','.msg-s-event-listitem__time-heading'],node)})).filter(item=>item.text).filter((item,i,all)=>i===0||item.text!==all[i-1].text).slice(-80)
}
function capture(){
  const type=detectPageType(),main=document.querySelector('main')||document.querySelector('[role="main"]')||document.body,links=externalLinks(),thread=captureThread();
  const companyName=type==='company'?firstText(['main h1','[role="main"] h1','h1.org-top-card-summary__title','.org-top-card-summary__title']):firstText(['a[href*="/company/"] span','a[href*="/sales/company/"] span','.msg-thread__link-to-profile']);
  return{page:{type,url:location.href,personName:type==='profile'?firstText(['main h1','h1.text-heading-xlarge','.profile-topcard-person-entity__name']):'',personHeadline:type==='profile'?firstText(['main .text-body-medium','.pv-text-details__left-panel .text-body-medium','.profile-topcard__summary-position-title']):'',companyName,companyWebsite:links[0]||'',externalLinks:links,visibleText:(main.innerText||'').replace(/\s+/g,' ').trim().slice(0,14000),hasVisibleThread:thread.length>0},thread};
}
chrome.runtime.onMessage.addListener((message,_sender,sendResponse)=>{if(message?.type==='DRIX_CAPTURE_CONTEXT')sendResponse(capture())});
