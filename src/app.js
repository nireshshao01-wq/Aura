(function(){
'use strict';
const C=window.CORE,CATS=C.CATS,PRODUCTS=C.PRODUCTS,BY=C.BY,ZONE=C.ZONE,RATES=C.RATES;
let CFG=JSON.parse(JSON.stringify(C.DEFAULTS));
const IMG={};
const $=(s,r)=>(r||document).querySelector(s);
const $$=(s,r)=>Array.from((r||document).querySelectorAll(s));
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const R=n=>{const v=Math.round(n*100)/100;const s=(v%1?v.toFixed(2):String(v)).replace(/\B(?=(\d{3})+(?!\d))/g,' ');return 'R'+s};
const catOf=id=>CATS.find(c=>c.id===id);
const mem={};
const kv={get(k,d){try{const v=localStorage.getItem(k);if(v!==null)return JSON.parse(v)}catch(e){}return k in mem?mem[k]:d},set(k,v){mem[k]=v;try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}},del(k){delete mem[k];try{localStorage.removeItem(k)}catch(e){}}};
const fdate=s=>{try{const d=new Date(String(s).indexOf('T')>-1||String(s).indexOf('Z')>-1?s:String(s).replace(' ','T')+'Z');return d.toLocaleDateString('en-ZA',{day:'numeric',month:'short',year:'numeric'})}catch(e){return ''}};

/*ART*/

/* ============ BACKENDS: live server, or in-browser preview ============ */
const api={mode:'preview'};
async function call(method,path,body){
  const opt={method:method,credentials:'same-origin',headers:{}};
  if(body!==undefined){opt.headers['Content-Type']='application/json';opt.body=JSON.stringify(body)}
  const r=await fetch('/api'+path,opt);let j=null;try{j=await r.json()}catch(e){}
  if(!r.ok)throw new Error((j&&j.error)||'Something went wrong. Please try again.');
  return j;
}
const SRV={
  config:()=>call('GET','/config'),images:()=>call('GET','/images'),
  me:async()=>(await call('GET','/me')).user,
  register:async d=>(await call('POST','/register',d)).user,
  login:async(email,password)=>(await call('POST','/login',{email:email,password:password})).user,
  logout:()=>call('POST','/logout',{}),
  placeOrder:p=>call('POST','/orders',p),
  myOrders:async()=>(await call('GET','/orders')).orders,
  sendEnquiry:d=>call('POST','/enquiries',d),
  adminOrders:async()=>(await call('GET','/admin/orders')).orders,
  adminSetOrder:(id,status)=>call('PATCH','/admin/orders/'+id,{status:status}),
  adminCustomers:async()=>(await call('GET','/admin/customers')).customers,
  adminSetCustomer:(id,t)=>call('PATCH','/admin/customers/'+id,{tradeStatus:t}),
  adminEnquiries:async()=>(await call('GET','/admin/enquiries')).enquiries,
  adminSetEnquiry:(id,status)=>call('PATCH','/admin/enquiries/'+id,{status:status})
};
/* Preview backend: everything is kept in this browser only. For demonstration, not for real customers. */
async function sha(s){
  if(window.crypto&&crypto.subtle){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('aura|'+s));return Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,'0')).join('')}
  return 'p'+s.split('').reduce((a,c)=>(a*31+c.charCodeAt(0))>>>0,7);
}
async function dbo(){
  let d=kv.get('aura.db',null);
  if(!d){d={users:[],orders:[],enquiries:[],sess:null,seq:10};
    d.users.push({id:1,email:'admin@auraandco.co.za',name:'Store admin',role:'admin',accountType:'retail',tradeStatus:'none',company:'',phone:'',bizType:'',vat:'',address:null,pw:await sha('preview1234'),createdAt:new Date().toISOString()});
    kv.set('aura.db',d)}
  return d;
}
const save=d=>kv.set('aura.db',d);
const pub=u=>{if(!u)return null;const o=Object.assign({},u);delete o.pw;return o};
const sess=d=>d.users.find(u=>u.id===d.sess)||null;
const needAdminM=d=>{const u=sess(d);if(!u||u.role!=='admin')throw new Error('Not allowed.')};
const isEmailOk=s=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const MOCK={
  config:async()=>CFG,images:async()=>Object.assign({},window.__IMG_MANIFEST||{}),
  me:async()=>pub(sess(await dbo())),
  async register(b){
    const d=await dbo(),email=String(b.email||'').trim().toLowerCase();
    if(!isEmailOk(email))throw new Error('Enter a valid email address.');
    if(!String(b.name||'').trim())throw new Error('Enter your name.');
    if(String(b.password||'').length<8)throw new Error('Choose a password of at least 8 characters.');
    if(b.accountType==='trade'&&!String(b.company||'').trim())throw new Error('Enter your business name to apply for a trade account.');
    if(d.users.some(u=>u.email===email))throw new Error('An account with this email already exists. Try signing in.');
    const trade=b.accountType==='trade';
    const u={id:d.seq++,email:email,name:String(b.name).trim(),phone:String(b.phone||'').trim(),company:String(b.company||'').trim(),bizType:b.bizType||'',vat:String(b.vat||'').trim(),role:'customer',accountType:trade?'trade':'retail',tradeStatus:trade?'pending':'none',address:null,pw:await sha(b.password),createdAt:new Date().toISOString()};
    d.users.push(u);d.sess=u.id;save(d);return pub(u);
  },
  async login(email,password){
    const d=await dbo(),u=d.users.find(x=>x.email===String(email||'').trim().toLowerCase());
    if(!u||u.pw!==await sha(password||''))throw new Error('Email or password is incorrect.');
    d.sess=u.id;save(d);return pub(u);
  },
  async logout(){const d=await dbo();d.sess=null;save(d);return{ok:true}},
  async placeOrder(p){
    const d=await dbo(),u=sess(d),trade=!!u&&u.accountType==='trade'&&u.tradeStatus==='approved';
    const t=C.compute({lines:p.items,province:p.address.province,delivery:p.delivery,giftWrap:p.giftWrap,trade:trade,cfg:CFG});
    if(!t.opt)throw new Error('Choose a delivery method.');
    if(p.payment==='account'&&!trade)throw new Error('Pay on account is only available to approved trade accounts.');
    const dt=new Date(),pad=n=>String(n).padStart(2,'0');
    const ref='AC-'+String(dt.getFullYear()).slice(2)+pad(dt.getMonth()+1)+pad(dt.getDate())+'-'+Math.floor(1000+Math.random()*9000);
    const payName={payfast:'Card or Instant EFT (PayFast)',bank:'Bank transfer (EFT)',account:'Pay on account'}[p.payment];
    const status=p.payment==='account'?'Awaiting invoice':(p.demoPaid?'Paid':'Awaiting payment');
    const o={id:d.seq++,ref:ref,userId:u?u.id:null,demo:true,email:p.email,items:t.lines.map(l=>({id:l.id,ci:l.ci,name:l.name,color:l.color,qty:l.qty,unit:l.unit,retail:l.retail,line:l.line})),sub:t.sub,ship:t.ship,wrap:t.wrap,total:t.total,vat:t.vat,saved:t.saved,tradePricing:trade,deliveryName:t.opt.name,deliveryId:t.opt.id,days:t.opt.days,paymentId:p.payment,payName:payName,status:status,paymentStatus:p.demoPaid?'paid':'pending',giftMsg:p.giftMsg||'',po:p.po||'',notes:p.notes||'',address:Object.assign({},p.address,{phone:p.phone}),date:new Date().toISOString()};
    d.orders.unshift(o);if(u){u.address=o.address;if(!u.phone)u.phone=p.phone}
    save(d);return{order:o,payfast:null};
  },
  async myOrders(){const d=await dbo(),u=sess(d);if(!u)throw new Error('Please sign in.');return d.orders.filter(o=>o.userId===u.id)},
  async sendEnquiry(b){
    const d=await dbo();
    if(!String(b.name||'').trim())throw new Error('Enter your name.');
    if(!isEmailOk(String(b.email||'').trim()))throw new Error('Enter a valid email address.');
    if(String(b.message||'').trim().length<5)throw new Error('Tell us a little about what you need.');
    d.enquiries.unshift({id:d.seq++,name:b.name,email:b.email,phone:b.phone||'',company:b.company||'',topic:b.topic||'',message:b.message,items:b.items||[],status:'New',createdAt:new Date().toISOString()});
    save(d);return{ok:true};
  },
  async adminOrders(){const d=await dbo();needAdminM(d);return d.orders},
  async adminSetOrder(id,status){const d=await dbo();needAdminM(d);const o=d.orders.find(x=>x.id===id);if(o){o.status=status;if(status==='Paid')o.paymentStatus='paid'}save(d);return{ok:true}},
  async adminCustomers(){const d=await dbo();needAdminM(d);return d.users.slice().reverse().map(pub)},
  async adminSetCustomer(id,t){const d=await dbo();needAdminM(d);const u=d.users.find(x=>x.id===id);if(u){u.tradeStatus=t;if(t!=='none')u.accountType='trade'}save(d);return{ok:true}},
  async adminEnquiries(){const d=await dbo();needAdminM(d);return d.enquiries},
  async adminSetEnquiry(id,status){const d=await dbo();needAdminM(d);const e=d.enquiries.find(x=>x.id===id);if(e)e.status=status;save(d);return{ok:true}}
};
let B=MOCK;
async function detectServer(){
  if(location.protocol!=='http:'&&location.protocol!=='https:')return false;
  try{const ctl=new AbortController(),t=setTimeout(()=>ctl.abort(),1500);const r=await fetch('/api/ping',{signal:ctl.signal,credentials:'same-origin'});clearTimeout(t);if(!r.ok)return false;const j=await r.json();return !!(j&&j.app==='aura')}catch(e){return false}
}

/* ============ STATE ============ */
const emptyCo={email:'',phone:'',first:'',last:'',company:'',street:'',suburb:'',city:'',province:'',postal:'',notes:'',po:'',delivery:'standard',giftWrap:false,giftMsg:'',payment:'',terms:false};
const photosOf=p=>{const o=[];if(IMG[p.id])o.push(IMG[p.id]);for(let i=2;i<=8;i++){if(IMG[p.id+'-'+i])o.push(IMG[p.id+'-'+i]);else break}return o};
const state={
  cart:(kv.get('aura.cart',[])||[]).filter(l=>BY[l.id]&&BY[l.id].colors[l.ci]),
  user:null,q:'',sort:'featured',pd:{ci:0,qty:1,ph:0},co:Object.assign({},emptyCo),order:kv.get('aura.order',null),
  regType:'trade',accTab:'orders',admTab:'orders',quote:false,sent:null
};
const saveCart=()=>kv.set('aura.cart',state.cart);
const isTrade=()=>!!state.user&&state.user.accountType==='trade'&&state.user.tradeStatus==='approved';
const unit=p=>C.unitPrice(p,isTrade(),CFG);

/* ============ CART ============ */
const itemCount=()=>state.cart.reduce((s,l)=>s+l.qty,0);
function cartSub(){return state.cart.reduce((s,l)=>s+unit(BY[l.id])*l.qty,0)}
function addToCart(id,ci,qty){
  const l=state.cart.find(x=>x.id===id&&x.ci===ci);
  if(l)l.qty=Math.min(99,l.qty+qty);else state.cart.push({id:id,ci:ci,qty:qty});
  saveCart();renderCart();toast('Added to your cart');
}
function renderCart(){
  $('#cartCount').textContent=itemCount();
  const body=$('#drawerBody'),foot=$('#drawerFoot');
  if(!state.cart.length){
    body.innerHTML='<div class="empty"><p style="margin-bottom:18px">Your cart is empty.</p><a class="btn" href="#shop" data-act="close-cart">Start shopping</a></div>';
    foot.hidden=true;return;
  }
  foot.hidden=false;
  body.innerHTML=state.cart.map((l,i)=>{const p=BY[l.id];return `<div class="line">
    <div class="th">${pic(p,l.ci)}</div>
    <div><h4>${esc(p.name)}</h4><small>${esc(p.colors[l.ci].name)}</small>
      <div class="qty" role="group" aria-label="Quantity"><button data-act="qty" data-i="${i}" data-d="-1" aria-label="Decrease quantity">–</button><span>${l.qty}</span><button data-act="qty" data-i="${i}" data-d="1" aria-label="Increase quantity">+</button></div>
      <div><button class="rm" data-act="remove" data-i="${i}">Remove</button></div></div>
    <div class="price">${R(unit(p)*l.qty)}</div></div>`}).join('');
  const sub=cartSub(),left=CFG.freeDeliveryOver-sub,pct=Math.min(100,sub/CFG.freeDeliveryOver*100);
  const saved=state.cart.reduce((s,l)=>s+(BY[l.id].price-unit(BY[l.id]))*l.qty,0);
  foot.innerHTML=`<div class="free-bar">${left>0?`Add <b>${R(left)}</b> more for free standard delivery`:'<b>You have free standard delivery</b>'}<div><i style="width:${pct}%"></i></div></div>
    ${saved>0?`<p class="hint" style="margin-top:8px"><b>Trade pricing applied.</b> You save ${R(saved)}.</p>`:''}
    <div class="row total"><span>Subtotal</span><span>${R(sub)}</span></div>
    <p class="hint" style="margin:6px 0 14px">Delivery is calculated at checkout.${CFG.vatRegistered?' Prices include VAT.':''}</p>
    <a class="btn block" href="#checkout" data-act="close-cart">Checkout</a>
    <p style="margin-top:12px;text-align:center"><a class="tlink" href="#quote" data-act="close-cart">Request a quote for larger quantities</a></p>`;
}
function openCart(){renderCart();$('#drawer').classList.add('open');$('#backdrop').classList.add('open');$('#drawer').setAttribute('aria-hidden','false');setTimeout(()=>{const b=$('#drawer .ibtn');b&&b.focus()},50)}
function closeCart(){$('#drawer').classList.remove('open');$('#backdrop').classList.remove('open');$('#drawer').setAttribute('aria-hidden','true')}
let tt;function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('show');clearTimeout(tt);tt=setTimeout(()=>t.classList.remove('show'),2400)}

/* ============ TOTALS ============ */
function totals(){
  const c=state.co,t=C.compute({lines:state.cart,province:c.province,delivery:c.delivery,giftWrap:c.giftWrap,trade:isTrade(),cfg:CFG});
  if(t.opt)c.delivery=t.opt.id;
  return t;
}
function payOptions(){
  const o=[];
  if(CFG.payfastEnabled||api.mode==='preview')o.push({id:'payfast',name:'Card or Instant EFT',sub:'Pay securely online with PayFast',provider:'PayFast'});
  o.push({id:'bank',name:'Bank transfer (EFT)',sub:'We dispatch once the payment reflects in our account'});
  if(isTrade())o.push({id:'account',name:'Pay on account',sub:CFG.accountTerms});
  return o;
}

/* ============ VIEWS ============ */
const priceTxt=p=>`<p class="price">${R(unit(p))}${isTrade()?`<s>${R(p.price)}</s><span class="tradetag">Trade</span>`:''}</p>`;
const card=p=>`<article class="card">
  <a class="card-img" href="#p-${p.id}" aria-label="${esc(p.name)}">${pic(p,0)}${p.tag?`<span class="tag">${esc(p.tag)}</span>`:''}</a>
  <div class="card-body"><p class="eyebrow">${esc(catOf(p.cat).name)}</p><h3><a href="#p-${p.id}">${esc(p.name)}</a></h3>
  ${priceTxt(p)}
  <div class="dots" aria-label="${p.colors.length} colours">${p.colors.map(c=>`<span style="background:${c.hex}" title="${esc(c.name)}"></span>`).join('')}</div>
  <button class="btn small" data-act="add" data-id="${p.id}">Add to cart</button></div></article>`;
function sortList(l){const a=l.slice();if(state.sort==='low')a.sort((x,y)=>x.price-y.price);else if(state.sort==='high')a.sort((x,y)=>y.price-x.price);else if(state.sort==='name')a.sort((x,y)=>x.name.localeCompare(y.name));return a}
const tradeLine=()=>state.user?(state.user.accountType==='trade'&&state.user.tradeStatus==='approved'?'':'') :'';

const views={
home(){
  const feat=['h1','s1','c2','g2','a1','k1','sc3','j1'].map(i=>BY[i]);
  const arches=`<div class="arches" aria-hidden="true"><div class="arch">${art('candle','#F26A57',0,'#CFC5FF')}</div><div class="arch">${art('vase','#2D5BA8',0,'#8FDAD4')}</div><div class="arch">${art('cushion','#F2B632',2,'#B5EBD6')}</div></div>`;
  const vis=IMG.hero?`<div class="arches" style="grid-template-columns:1fr"><div class="arch" style="aspect-ratio:5/6;max-width:560px;margin-left:auto"><img src="${esc(IMG.hero)}" alt="" style="width:100%;height:100%;object-fit:cover"></div></div>`:arches;
  return `<section class="hero"><div class="wrap">
    <div><p class="eyebrow">Decor, gifting &amp; hospitality supply</p><div class="rule"></div>
      <h1>Colour, calm and <em>considered</em> pieces.</h1>
      <p class="lede">Specialised and unique homeware, jewellery and gifts for the hospitality, corporate and retail sector, and anyone who loves a room with personality. Trade accounts, nationwide courier delivery.</p>
      <div class="cta"><a class="btn" href="#shop">Shop the collection</a><a class="btn ghost" href="#trade">Open a trade account</a></div></div>
    ${vis}
  </div></section>

  <section class="block tint"><div class="wrap">
    <div class="sec-head"><div><p class="eyebrow">Shop by category</p><h2>Eight ways to brighten a room</h2></div><a class="tlink" href="#shop">View all</a></div>
    <div class="cats">${CATS.map(c=>`<a class="cat" href="#cat-${c.id}"><div class="img">${photo('cat-'+c.id,pic(BY[c.rep],0))}</div><h3>${c.name}<span>${PRODUCTS.filter(p=>p.cat===c.id).length} pieces</span></h3></a>`).join('')}</div>
  </div></section>

  <section class="block"><div class="wrap">
    <div class="sec-head"><div><p class="eyebrow">Favourites</p><h2>Our most-loved pieces</h2></div><a class="tlink" href="#shop">Shop all</a></div>
    <div class="grid">${feat.map(card).join('')}</div>
  </div></section>

  <section class="block" style="padding-top:0"><div class="wrap"><div class="trade-banner">
    <div><p class="eyebrow" style="color:var(--ink)">For hospitality, corporate and retail</p><h2 style="margin-top:8px">Buying for a business? Open a trade account.</h2><p>Apply once and get trade pricing on every order, easy reordering and invoice terms for approved accounts.</p><a class="btn" href="#trade">See how it works</a></div>
    <ul><li><b>${Math.round(CFG.tradeDiscount*100)}% off</b> retail prices for approved accounts</li><li><b>Pay on account</b> for approved trade customers</li><li><b>Quotes</b> for larger quantities and room packages</li><li><b>Reorder</b> a past order in one click</li></ul>
  </div></div></section>

  <section class="block" style="padding-top:0"><div class="wrap"><div class="gift-band">
    <div class="txt"><p class="eyebrow" style="color:#BFE6E0">Gifting</p><h2 style="margin-top:10px">Gifts that feel like a deep breath.</h2><p>Candles, diffusers, hampers and welcome boxes. Add gift wrap and a personal message at checkout.</p><a class="btn" href="#cat-gifting">Shop gifting</a></div>
    <div class="pic" aria-hidden="true">${photo('gift-band',art('hamper','#D9B77A',0,'#CFC5FF'))}</div>
  </div></div></section>

  <section class="block coral"><div class="wrap">
    <div class="perks">
      <div class="perk"><span class="n">1</span><h3>Delivered nationwide</h3><p>Courier delivery to your door in every province, with free standard delivery over ${R(CFG.freeDeliveryOver)}.</p></div>
      <div class="perk"><span class="n">2</span><h3>Curated colour</h3><p>A bright, considered edit of textures and tones that work together, so rooms come together easily.</p></div>
      <div class="perk"><span class="n">3</span><h3>Gift-ready</h3><p>Optional gift wrap and a personal message on any order, sent straight to the recipient.</p></div>
      <div class="perk"><span class="n">4</span><h3>Flexible payment</h3><p>Pay by card, instant EFT or bank transfer. Approved trade accounts can pay on account.</p></div>
    </div>
  </div></section>

  ${views.stories()}`;
},
stories(){
  const S=[
   {region:'Gauteng',type:'A hospitality venue',brief:'Refresh 24 guest rooms with a brighter, more tactile look before the busy season.',supply:'Scatter cushions, wool-blend throws, ceramic vases and a welcome gift for each arrival.',goal:'Rooms that feel consistent and joyful, with details guests photograph and remember.'},
   {region:'Durban',type:'A retail store on the coast',brief:'Freshen the shop floor and add a gifting corner that lifts the average basket.',supply:'Sculptures, reed diffusers, scented candles, jewellery and gift boxes.',goal:'A store that feels curated, with gifts customers take home.'},
   {region:'Cape Town',type:'A corporate office',brief:'Make reception and the client lounge warm and welcoming, and gift key clients at year end.',supply:'Throws, stoneware serving pieces, a round mirror, baskets, faux florals and gift boxes.',goal:'A reception clients remember, with gifts that carry the brand.'}];
  return `<section class="block lilac"><div class="wrap">
    <div class="sec-head"><div><p class="eyebrow">Gauteng · Durban · Cape Town</p><h2>Spaces we're made for</h2><p class="lede">Three illustrative scenarios showing how hospitality, corporate and retail spaces can use the collection.</p></div></div>
    <div class="stories">${S.map(s=>`<article class="story"><div class="region"><span class="eyebrow">${esc(s.region)}</span><span class="pill">Illustrative</span></div><h3>${esc(s.type)}</h3>
      <dl><div><dt>The brief</dt><dd>${esc(s.brief)}</dd></div><div><dt>What suits it</dt><dd>${esc(s.supply)}</dd></div><div><dt>What good looks like</dt><dd>${esc(s.goal)}</dd></div></dl></article>`).join('')}</div>
    <p class="note">These scenarios illustrate the kinds of spaces Aura &amp; Co. supplies. They are not customer testimonials. Real client stories will replace them as they come in.</p>
  </div></section>`;
},
shop(r){
  const cat=r.cat?catOf(r.cat):null;
  const list=sortList(PRODUCTS.filter(p=>!cat||p.cat===cat.id));
  return `<section class="wrap page-head"><p class="eyebrow">${cat?'Collection':'The collection'}</p><h1>${cat?esc(cat.name):'All products'}</h1>
    <p class="lede">${cat?esc(cat.blurb):'Decor, gifting, clothing and jewellery for bright, beautiful spaces.'}</p>
    ${!state.user?`<p class="hint" style="margin-top:10px"><a href="#trade" style="text-decoration:underline">Trade customer?</a> Register for ${Math.round(CFG.tradeDiscount*100)}% off retail prices.</p>`:''}
    <div class="chips"><a class="chip${cat?'':' on'}" href="#shop">All</a>${CATS.map(c=>`<a class="chip${cat&&cat.id===c.id?' on':''}" href="#cat-${c.id}">${c.name}</a>`).join('')}</div>
    <div class="toolbar"><span>${list.length} products</span><label>Sort by<select id="sort">${[['featured','Featured'],['low','Price: low to high'],['high','Price: high to low'],['name','Name A to Z']].map(o=>`<option value="${o[0]}"${state.sort===o[0]?' selected':''}>${o[1]}</option>`).join('')}</select></label></div></section>
    <section class="wrap" style="padding-bottom:84px"><div class="grid">${list.map(card).join('')}</div></section>`;
},
search(){
  const q=state.q.trim().toLowerCase();
  const list=q?sortList(PRODUCTS.filter(p=>(p.name+' '+p.desc+' '+catOf(p.cat).name+' '+p.colors.map(c=>c.name).join(' ')).toLowerCase().includes(q))):[];
  return `<section class="wrap page-head"><p class="eyebrow">Search</p><h1>${q?`Results for “${esc(state.q.trim())}”`:'Search the collection'}</h1><p class="lede">${q?list.length+' product'+(list.length===1?'':'s')+' found.':'Type in the search box above to find a product.'}</p></section>
    <section class="wrap" style="padding-bottom:84px">${list.length?`<div class="grid">${list.map(card).join('')}</div>`:q?'<div class="empty"><p>Nothing matched that search. Try a broader word like “vase”, “candle” or “throw”.</p><p style="margin-top:16px"><a class="btn" href="#shop">Browse everything</a></p></div>':''}</section>`;
},
product(r){
  const p=r.p,cat=catOf(p.cat),rel=PRODUCTS.filter(x=>x.cat===p.cat&&x.id!==p.id).slice(0,4);
  const ci=Math.min(state.pd.ci,p.colors.length-1),ph=photosOf(p),phi=Math.min(state.pd.ph||0,Math.max(ph.length-1,0));
  return `<div class="wrap"><nav class="crumbs" aria-label="Breadcrumb"><a href="#home">Home</a> / <a href="#cat-${cat.id}">${esc(cat.name)}</a> / ${esc(p.name)}</nav>
  <div class="pd"><div><div class="pd-main" id="pdMain" role="img" aria-label="${esc(p.name)}${ph.length?'':', '+esc(p.colors[ci].name)}">${ph.length?`<img src="${esc(ph[phi])}" alt="${esc(p.name)}">`:pic(p,ci)}</div>
    ${ph.length>1?`<div class="thumbs">${ph.map((src,i)=>`<button data-act="pick-photo" data-i="${i}" aria-pressed="${i===phi}" aria-label="Photo ${i+1} of ${ph.length}"><img src="${esc(src)}" alt="" loading="lazy"></button>`).join('')}</div>`:(!ph.length&&p.colors.length>1?`<div class="thumbs">${p.colors.map((c,i)=>`<button data-act="pick-color" data-ci="${i}" aria-pressed="${i===ci}" aria-label="${esc(c.name)}">${pic(p,i)}</button>`).join('')}</div>`:'')}</div>
    <div class="pd-info"><p class="eyebrow">${esc(cat.name)}</p><h1>${esc(p.name)}</h1>
      <p class="pd-price">${R(unit(p))}${isTrade()?` <s style="font-size:1rem;color:var(--muted);font-weight:400">${R(p.price)}</s><span class="tradetag">Trade price</span>`:''}</p>
      <p class="vat">${CFG.vatRegistered?'Includes VAT. ':''}Delivery calculated at checkout.</p>
      ${!isTrade()?`<p class="hint" style="margin-top:6px">${state.user?(state.user.accountType==='trade'?'Your trade application is pending. Trade pricing appears here once it is approved.':'<a href="#trade" style="text-decoration:underline">Apply for a trade account</a> for '+Math.round(CFG.tradeDiscount*100)+'% off.'):'<a href="#account" style="text-decoration:underline">Sign in</a> or <a href="#trade" style="text-decoration:underline">open a trade account</a> for '+Math.round(CFG.tradeDiscount*100)+'% off.'}</p>`:''}
      <p class="desc">${esc(p.desc)}</p>
      ${p.colors.length>1?`<span class="opt-label">Colour: <span id="colName">${esc(p.colors[ci].name)}</span></span><div class="swatches">${p.colors.map((c,i)=>`<button class="sw" data-act="pick-color" data-ci="${i}" aria-pressed="${i===ci}"><i style="background:${c.hex}"></i>${esc(c.name)}</button>`).join('')}</div>`:''}
      <div class="buyrow"><div class="qty" role="group" aria-label="Quantity"><button data-act="pd-qty" data-d="-1" aria-label="Decrease quantity">–</button><span id="pdQty">${state.pd.qty}</span><button data-act="pd-qty" data-d="1" aria-label="Increase quantity">+</button></div>
        <button class="btn" data-act="add-pd" data-id="${p.id}">Add to cart</button></div>
      <p style="margin-top:14px"><a class="tlink" href="#quote">Need larger quantities? Request a quote</a></p>
      <div style="margin-top:30px">
        <details open><summary>Delivery</summary><p>Courier delivery across South Africa. Free standard delivery on orders over ${R(CFG.freeDeliveryOver)}. See our <a href="#delivery" style="text-decoration:underline">delivery rates</a>.</p></details>
        <details><summary>Gifting</summary><p>Add gift wrap and a personal message at checkout. We can send it straight to the recipient.</p></details>
        <details><summary>Returns</summary><p>Changed your mind? You can return unused items in their original packaging. Read the full <a href="#delivery" style="text-decoration:underline">returns policy</a>.</p></details>
      </div></div></div>
  ${rel.length?`<section style="padding-bottom:84px"><div class="sec-head"><h2>You may also like</h2></div><div class="grid">${rel.map(card).join('')}</div></section>`:''}</div>`;
},
trade(){
  const pct=Math.round(CFG.tradeDiscount*100);
  return `<section class="wrap prose"><div class="inner"><p class="eyebrow">Trade accounts</p><h1>Buying for a business?</h1>
  <p class="lede">Businesses in the hospitality, corporate and retail sector, as well as interior designers and corporate gifting teams, can apply for a trade account.</p>
  <h2>What you get</h2>
  <ul><li><b>${pct}% off</b> our retail prices on every order, once your account is approved.</li><li><b>Pay on account</b> for approved customers, with an invoice instead of paying at checkout. ${esc(CFG.accountTerms)}</li><li><b>Quotes</b> for larger quantities and room packages.</li><li><b>Reorder in one click</b> from your order history.</li><li>A purchase order number field at checkout for your records.</li></ul>
  <h2>How it works</h2>
  <ul><li>Create a trade account with your business details.</li><li>We review your application. You can shop at standard prices straight away.</li><li>Once approved, trade pricing and pay on account switch on automatically.</li></ul>
  <p style="margin-top:24px;display:flex;gap:12px;flex-wrap:wrap"><a class="btn" href="#account" data-act="go-register">Apply for a trade account</a><a class="btn ghost" href="#quote">Request a quote</a></p>
  </div></section>`;
},
account(){return state.user?views.dash():views.auth()},
auth(){
  const t=state.regType==='trade';
  return `<div class="wrap"><section class="page-head" style="padding-bottom:26px"><p class="eyebrow">My account</p><h1>Sign in or create an account</h1></section>
  <div class="auth">
   <div class="panel"><h2>Sign in</h2><p class="sub">Welcome back.</p>
    <form data-form="login" novalidate>
     <div class="fld" style="margin-bottom:14px"><label for="l-email">Email address</label><input id="l-email" name="email" type="email" autocomplete="email" required></div>
     <div class="fld"><label for="l-pw">Password</label><input id="l-pw" name="password" type="password" autocomplete="current-password" required></div>
     <p class="formerr" role="alert" id="l-err"></p>
     <button class="btn block" type="submit">Sign in</button>
    </form>
    ${api.mode==='preview'?'<p class="hint" style="margin-top:14px">Preview mode: to see the admin area, sign in as <b>admin@auraandco.co.za</b> with password <b>preview1234</b>.</p>':''}
   </div>
   <div class="panel"><h2>Create an account</h2><p class="sub">Save your details, track orders and reorder easily.</p>
    <form data-form="register" novalidate>
     <div class="seg"><label><input type="radio" name="accountType" value="trade" ${t?'checked':''}><b>Business</b><small>Trade pricing and pay on account</small></label><label><input type="radio" name="accountType" value="retail" ${t?'':'checked'}><b>Personal</b><small>Shop for yourself or as a gift</small></label></div>
     <div class="fgrid">
      <div class="fld wide"><label for="r-name">Full name</label><input id="r-name" name="name" autocomplete="name" required></div>
      <div class="fld"><label for="r-email">Email address</label><input id="r-email" name="email" type="email" autocomplete="email" required></div>
      <div class="fld"><label for="r-phone">Mobile number</label><input id="r-phone" name="phone" type="tel" autocomplete="tel"></div>
      <div class="fld biz" ${t?'':'hidden'}><label for="r-company">Business name</label><input id="r-company" name="company" autocomplete="organization"></div>
      <div class="fld biz" ${t?'':'hidden'}><label for="r-biz">Type of business</label><select id="r-biz" name="bizType"><option value="">Select</option>${['Hospitality','Corporate','Retailer','Interior designer or decorator','Corporate gifting','Other'].map(x=>`<option>${x}</option>`).join('')}</select></div>
      <div class="fld wide biz" ${t?'':'hidden'}><label for="r-vat">VAT or company registration number <span class="opt">(optional)</span></label><input id="r-vat" name="vat"></div>
      <div class="fld wide"><label for="r-pw">Password</label><input id="r-pw" name="password" type="password" autocomplete="new-password" minlength="8" required><p class="hint" style="margin-top:4px">At least 8 characters.</p></div>
     </div>
     <label class="checkline"><input type="checkbox" name="consent" required><span>I agree to the <a href="#privacy" style="text-decoration:underline">privacy policy</a> and the <a href="#delivery" style="text-decoration:underline">delivery and returns policy</a>.</span></label>
     <p class="formerr" role="alert" id="r-err"></p>
     <button class="btn block" type="submit">Create account</button>
    </form>
   </div>
  </div></div>`;
},
dash(){
  const u=state.user,ts=u.tradeStatus;
  let note='';
  if(u.accountType==='trade'&&ts==='pending')note='<div class="notice warn"><b>Trade application received.</b> We are reviewing it. You can shop at standard prices now. Trade pricing and pay on account switch on once you are approved.</div>';
  else if(isTrade())note=`<div class="notice ok"><b>Trade account approved.</b> You get ${Math.round(CFG.tradeDiscount*100)}% off retail prices and can pay on account at checkout.</div>`;
  else if(u.accountType==='trade'&&ts==='rejected')note='<div class="notice bad"><b>We could not approve trade pricing for this account.</b> Please <a href="#contact" style="text-decoration:underline">contact us</a> if you would like to discuss it.</div>';
  const a=u.address;
  return `<div class="wrap"><div class="dash-head"><div><p class="eyebrow">My account</p><h1>Hello, ${esc(u.name.split(' ')[0])}</h1>${u.company?`<p class="lede" style="margin-top:6px">${esc(u.company)}</p>`:''}</div>
    <div style="display:flex;gap:10px;flex-wrap:wrap">${u.role==='admin'?'<a class="btn" href="#admin">Admin area</a>':''}<button class="btn ghost" data-act="logout">Sign out</button></div></div>
    ${note}
    ${u.accountType!=='trade'&&u.role!=='admin'?'<div class="notice ok">Buying for a business? <a href="#trade" style="text-decoration:underline">Find out about trade accounts</a>.</div>':''}
    <div class="tabs" role="tablist"><button role="tab" data-act="acc-tab" data-t="orders" aria-selected="${state.accTab==='orders'}">Orders</button><button role="tab" data-act="acc-tab" data-t="details" aria-selected="${state.accTab==='details'}">My details</button></div>
    ${state.accTab==='orders'?'<div id="ordList"><p class="hint">Loading your orders…</p></div>':`<div class="panel" style="max-width:720px"><dl class="kv">
      <dt>Name</dt><dd>${esc(u.name)}</dd><dt>Email</dt><dd>${esc(u.email)}</dd><dt>Mobile</dt><dd>${esc(u.phone)||'Not added'}</dd>
      ${u.company?`<dt>Business</dt><dd>${esc(u.company)}${u.bizType?' · '+esc(u.bizType):''}</dd>`:''}${u.vat?`<dt>VAT or reg. no.</dt><dd>${esc(u.vat)}</dd>`:''}
      <dt>Account type</dt><dd>${u.accountType==='trade'?'Trade ('+esc(ts)+')':'Personal'}</dd>
      <dt>Saved address</dt><dd>${a?`${esc(a.first)} ${esc(a.last)}<br>${esc(a.street)}, ${esc(a.suburb)}<br>${esc(a.city)}, ${esc(a.province)} ${esc(a.postal)}`:'Saved automatically from your next order'}</dd></dl></div>`}
  </div><div style="height:80px"></div>`;
},
checkout(){
  if(!state.cart.length)return `<section class="wrap page-head" style="padding-bottom:90px"><h1>Checkout</h1><p class="lede">Your cart is empty.</p><p style="margin-top:22px"><a class="btn" href="#shop">Continue shopping</a></p></section>`;
  const c=state.co,opts=payOptions();
  if(!opts.some(o=>o.id===c.payment))c.payment=opts[0].id;
  const fld=(k,label,o)=>{o=o||{};const type=o.type||'text',req=o.req!==false;return `<div class="fld${o.wide?' wide':''}"><label for="f-${k}">${label}${req?'':' <span class="opt">(optional)</span>'}</label><input id="f-${k}" data-k="${k}" type="${type}" autocomplete="${o.ac||'off'}" ${o.mode?`inputmode="${o.mode}"`:''} value="${esc(c[k])}"><p class="err" id="e-${k}" role="alert"></p></div>`};
  return `<div class="wrap"><nav class="crumbs"><a href="#home">Home</a> / Checkout</nav><h1 style="margin-bottom:20px">Checkout</h1>
  ${!state.user?'<div class="notice ok">Have an account? <a href="#account" style="text-decoration:underline">Sign in</a> for faster checkout and trade pricing. Guest checkout is fine too.</div>':''}
  <form class="co" data-form="checkout" novalidate>
   <div>
    <fieldset><legend>Contact</legend><div class="fgrid">${fld('email','Email address',{type:'email',ac:'email',wide:true})}${fld('phone','Mobile number',{type:'tel',ac:'tel',mode:'tel',wide:true})}</div></fieldset>
    <fieldset><legend>Delivery address</legend><div class="fgrid">
      ${fld('first','First name',{ac:'given-name'})}${fld('last','Last name',{ac:'family-name'})}
      ${fld('company','Company or business',{ac:'organization',req:false,wide:true})}
      ${fld('street','Street address',{ac:'address-line1',wide:true})}
      ${fld('suburb','Suburb',{ac:'address-level3'})}${fld('city','City or town',{ac:'address-level2'})}
      <div class="fld"><label for="f-province">Province</label><select id="f-province" data-k="province" autocomplete="address-level1"><option value="">Select province</option>${Object.keys(ZONE).sort().map(pr=>`<option${c.province===pr?' selected':''}>${pr}</option>`).join('')}</select><p class="err" id="e-province" role="alert"></p></div>
      ${fld('postal','Postal code',{ac:'postal-code',mode:'numeric'})}
      ${fld('po','Purchase order number',{req:false,wide:true})}
      <div class="fld wide"><label for="f-notes">Delivery notes <span class="opt">(optional)</span></label><textarea id="f-notes" data-k="notes" rows="2" placeholder="Gate code, reception hours, security desk…">${esc(c.notes)}</textarea></div>
    </div></fieldset>
    <fieldset><legend>Delivery method</legend><div id="deliveryOptions"></div></fieldset>
    <fieldset><legend>Gift options</legend>
      <label class="choice"><input type="checkbox" data-k="giftWrap" ${c.giftWrap?'checked':''}><span class="t"><b>Add gift wrap</b><small>Wrapped and ready to give</small></span><span class="p">${R(CFG.giftWrap)}</span></label>
      <div class="fld"><label for="f-giftMsg">Gift message <span class="opt">(optional)</span></label><textarea id="f-giftMsg" data-k="giftMsg" rows="3" maxlength="250" placeholder="Write a short note to include with the gift">${esc(c.giftMsg)}</textarea></div>
    </fieldset>
    <fieldset><legend>Payment</legend>${opts.map(m=>`<label class="choice"><input type="radio" name="pay" value="${m.id}" data-k="payment" ${c.payment===m.id?'checked':''}><span class="t"><b>${m.name}</b><small>${esc(m.sub)}</small></span></label>`).join('')}
      ${api.mode==='preview'?'<p class="hint">Preview mode: choosing a payment option will not charge you.</p>':''}</fieldset>
    <label class="checkline"><input type="checkbox" data-k="terms" id="f-terms" ${c.terms?'checked':''}><span>I accept the <a href="#delivery" style="text-decoration:underline">delivery and returns policy</a>.</span></label><p class="err" id="e-terms" role="alert"></p>
    <p class="formerr" role="alert" id="co-err"></p>
    <button class="btn block" type="submit" style="margin-top:6px" id="placeBtn">Place order</button>
   </div>
   <aside class="summary" id="summary" aria-label="Order summary"></aside>
  </form></div>`;
},
order(){
  const o=state.order;
  if(!o)return `<section class="wrap page-head" style="padding-bottom:90px"><h1>No recent order</h1><p style="margin-top:22px"><a class="btn" href="#shop">Continue shopping</a></p></section>`;
  const a=o.address,paid=o.paymentStatus==='paid'||o.status==='Paid';
  return `<section class="wrap conf"><p class="eyebrow">Thank you${a.first?', '+esc(a.first):''}</p><h1>Your order is in.</h1>
    <p class="lede">Order reference</p><p class="ref">${esc(o.ref)}</p>
    ${o.demo?'<div class="notice warn" style="margin-top:14px"><b>Preview order.</b> No payment was taken and nothing will be shipped.</div>':''}
    <div class="card2"><p class="eyebrow">Payment</p><p style="margin:6px 0 0"><b>${esc(o.payName)}</b>: <span class="stat s-${paid?'paid':'awaiting'}">${esc(o.status)}</span></p>
    ${o.paymentId==='bank'?`<div style="margin-top:14px"><p>Please pay <b>${R(o.total)}</b> using your order reference <b>${esc(o.ref)}</b> as the payment reference. We dispatch once the payment reflects.</p><p class="hint" style="margin-top:8px">${esc(CFG.bank.bank)} · ${esc(CFG.bank.holder)} · Account ${esc(CFG.bank.account)} · Branch ${esc(CFG.bank.branch)}</p></div>`:''}
    ${o.paymentId==='account'?`<p class="hint" style="margin-top:10px">We will send an invoice for this order. ${esc(CFG.accountTerms)}</p>`:''}
    ${o.paymentId==='payfast'&&!paid&&!o.demo?'<p class="hint" style="margin-top:10px">We are waiting for PayFast to confirm your payment. This page does not update by itself, so check <a href="#account" style="text-decoration:underline">My account</a> for the latest status.</p>':''}</div>
    <div class="card2"><p class="eyebrow">Delivery</p><p style="margin:6px 0 0"><b>${esc(o.deliveryName)}</b>, ${esc(o.days)} working days after dispatch</p>
      <p class="hint" style="margin-top:8px">${esc(a.first)} ${esc(a.last)}${a.company?', '+esc(a.company):''}<br>${esc(a.street)}, ${esc(a.suburb)}<br>${esc(a.city)}, ${esc(a.province)} ${esc(a.postal)}</p>
      ${o.po?`<p class="hint" style="margin-top:8px">Purchase order: ${esc(o.po)}</p>`:''}${o.giftMsg?`<p class="hint" style="margin-top:8px">Gift message: “${esc(o.giftMsg)}”</p>`:''}</div>
    <div class="card2"><p class="eyebrow">Items</p>${o.items.map(i=>`<div class="row"><span>${i.qty} × ${esc(i.name)} <small style="color:var(--muted)">(${esc(i.color)})</small></span><span>${R(i.line!=null?i.line:i.unit*i.qty)}</span></div>`).join('')}
      <div class="row" style="border-top:1px solid var(--line);margin-top:8px;padding-top:10px"><span>Delivery</span><span>${o.ship===0?'Free':R(o.ship)}</span></div>
      ${o.wrap?`<div class="row"><span>Gift wrap</span><span>${R(o.wrap)}</span></div>`:''}
      ${o.saved>0?`<div class="row"><span>Trade pricing saved you</span><span>${R(o.saved)}</span></div>`:''}
      <div class="row total"><span>Total</span><span>${R(o.total)}</span></div>${CFG.vatRegistered?`<p class="hint">Includes VAT of ${R(o.vat)}</p>`:''}</div>
    <p style="margin-top:28px;display:flex;gap:12px;flex-wrap:wrap"><a class="btn" href="#shop">Continue shopping</a>${state.user?'<a class="btn ghost" href="#account">View my orders</a>':'<a class="btn ghost" href="#account">Create an account</a>'}</p></section>`;
},
contact(){return enquiryView(false)},
quote(){return enquiryView(true)},
admin(){
  if(!state.user||state.user.role!=='admin')return `<section class="wrap page-head" style="padding-bottom:90px"><h1>Admin</h1><p class="lede">Please <a href="#account" style="text-decoration:underline">sign in</a> with an admin account.</p></section>`;
  return `<div class="wrap" style="padding-bottom:80px"><div class="dash-head"><div><p class="eyebrow">Admin</p><h1>Store admin</h1></div><a class="btn ghost" href="#account">My account</a></div>
   <div class="tabs" role="tablist">${[['orders','Orders'],['customers','Customers'],['enquiries','Enquiries']].map(t=>`<button role="tab" data-act="adm-tab" data-t="${t[0]}" aria-selected="${state.admTab===t[0]}">${t[1]}</button>`).join('')}</div>
   <div id="admBody"><p class="hint">Loading…</p></div></div>`;
},
delivery(){
  return `<section class="wrap prose"><div class="inner"><p class="eyebrow">Help</p><h1>Delivery &amp; returns</h1>
  <p class="lede">We are an online store and deliver by courier to your door. These are our current rates and timelines.</p>
  <h2>Delivery rates</h2>
  <div class="tbl"><table><thead><tr><th>Area</th><th>Standard</th><th>Express</th></tr></thead><tbody>
    <tr><td>Gauteng</td><td>${R(RATES.standard.A.price)} · ${RATES.standard.A.days} working days</td><td>${R(RATES.express.A.price)} · ${RATES.express.A.days} working days</td></tr>
    <tr><td>Western Cape and KwaZulu-Natal</td><td>${R(RATES.standard.B.price)} · ${RATES.standard.B.days} working days</td><td>${R(RATES.express.B.price)} · ${RATES.express.B.days} working days</td></tr>
    <tr><td>Free State, Mpumalanga, North West</td><td>${R(RATES.standard.B.price)} · ${RATES.standard.B.days} working days</td><td>Not available</td></tr>
    <tr><td>Eastern Cape, Limpopo, Northern Cape</td><td>${R(RATES.standard.C.price)} · ${RATES.standard.C.days} working days</td><td>Not available</td></tr>
  </tbody></table></div>
  <ul><li>Standard delivery is <b>free on orders over ${R(CFG.freeDeliveryOver)}</b>.</li><li>Orders are dispatched within 1 to 2 working days of payment reflecting, or of approval for pay-on-account orders.</li><li>We deliver to street addresses. A person should be available to receive the parcel.</li></ul>
  <h2>Payment</h2><p>You can pay by card or instant EFT, or by manual bank transfer. Approved trade accounts can pay on account. Orders paid by bank transfer are dispatched once the payment reflects in our account.</p>
  <h2>Returns</h2><p>You may cancel an order and return unused items in their original packaging within 7 days of receiving them. Contact us first so we can arrange the return. If an item arrives damaged or faulty, we will replace it or refund you.</p>
  <h2>Questions?</h2><p>Reach us on the <a href="#contact" style="text-decoration:underline">contact page</a>.</p></div></section>`;
},
about(){
  return `<section class="wrap prose"><div class="inner"><p class="eyebrow">About</p><h1>The Aura &amp; Co. Way</h1>
  <p style="margin-top:18px">Aura &amp; Co. imports specialised and unique pieces for the hospitality, corporate and retail sector. Every piece in our range is chosen for its colour, texture and character, so that the spaces it ends up in feel considered and complete.</p>
  <p>Our range is built around eight categories: clothing, jewellery, gifting, scatter cushions, sculptures, kitchen pieces, accessories and home decor. Each one is edited to work with the others, so a single order can furnish, finish and gift a space.</p>
  <p>To make ordering simple and convenient, we offer a user-friendly online ordering platform where customers can browse the full range, request a quote and place orders at any time. Business customers can open a <a href="#trade" style="text-decoration:underline">trade account</a> for trade pricing, easy reordering and, once approved, the option to pay on account.</p>
  <p>We are committed to providing exceptional customer service before, during and after every order. Orders are dispatched within one to two working days of payment, and we deliver by courier to every province, with free standard delivery on orders over ${R(CFG.freeDeliveryOver)}.</p>
  <p>We believe in offering quality, distinctive products at competitive trade prices, helping our customers maximise their profitability while giving their own clients and guests pieces they love.</p>
  <p>We would be proud to be one of your suppliers and look forward to building a successful, long-term partnership with you.</p>
  <p>Welcome to the Aura &amp; Co. family.</p>
  <p>Kindest regards,</p>
  <p><b>The Aura &amp; Co. Team</b></p>
  <p style="margin-top:24px;display:flex;gap:14px;flex-wrap:wrap"><a class="btn" href="#shop">Shop the collection</a><a class="btn ghost" href="#trade">Open a trade account</a></p></div></section>`;
},
privacy(){
  return `<section class="wrap prose"><div class="inner"><p class="eyebrow">Legal</p><h1>Privacy policy</h1>
  <p class="lede">How Aura &amp; Co. handles your personal information.</p>
  <h2>What we collect</h2><p>When you create an account, place an order or send an enquiry we collect your name, email address, phone number, delivery address and, for trade accounts, your business details. We collect this to process orders, deliver to you, manage your account and answer your questions.</p>
  <h2>How we use it</h2><p>We use your information only to run your account and orders and to respond to you. We share delivery details with our courier so your parcel can reach you, and payment details are handled by our payment provider. We do not sell your information.</p>
  <h2>Security</h2><p>Passwords are stored in encrypted (hashed) form and we never see or store your card details.</p>
  <h2>Your rights</h2><p>You can ask us to see, correct or delete your information at any time by contacting us at ${esc(CFG.contact.email)}.</p>
  <p class="hint">This is a starter policy and should be reviewed against POPIA (the Protection of Personal Information Act) before launch.</p></div></section>`;
}
};

function enquiryView(isQuote){
  const u=state.user||{},items=isQuote?state.cart:[];
  if(state.sent){const s=state.sent;return `<section class="wrap conf"><p class="eyebrow">${isQuote?'Quote request':'Message'} received</p><h1>Thank you.</h1><p class="lede">We have your ${isQuote?'quote request':'message'} and will reply to <b>${esc(s.email)}</b>.</p>${api.mode==='preview'?'<div class="notice warn" style="margin-top:14px"><b>Preview mode.</b> This message was saved in this browser only.</div>':''}<p style="margin-top:24px"><a class="btn" href="#shop" data-act="clear-sent">Continue shopping</a></p></section>`}
  return `<section class="wrap prose"><div class="inner"><p class="eyebrow">${isQuote?'Request a quote':'Contact'}</p><h1>${isQuote?'Tell us what you need.':'We\'d love to help.'}</h1>
  <p class="lede">${isQuote?'Planning a refresh for a hospitality, corporate or retail space? Send us your quantities and timeline and we will come back with pricing and availability.':'Questions about an order, a product or buying in larger quantities? Send us a message.'}</p>
  ${isQuote&&items.length?`<div class="notice ok"><b>Your cart will be included:</b><ul class="qitems">${items.map(l=>`<li>${l.qty} × ${esc(BY[l.id].name)} (${esc(BY[l.id].colors[l.ci].name)})</li>`).join('')}</ul></div>`:''}
  <form class="panel" data-form="enquiry" novalidate style="margin-top:20px">
   <div class="fgrid">
    <div class="fld"><label for="q-name">Your name</label><input id="q-name" name="name" autocomplete="name" value="${esc(u.name||'')}" required></div>
    <div class="fld"><label for="q-email">Email address</label><input id="q-email" name="email" type="email" autocomplete="email" value="${esc(u.email||'')}" required></div>
    <div class="fld"><label for="q-phone">Phone <span class="opt">(optional)</span></label><input id="q-phone" name="phone" type="tel" autocomplete="tel" value="${esc(u.phone||'')}"></div>
    <div class="fld"><label for="q-company">Business <span class="opt">(optional)</span></label><input id="q-company" name="company" autocomplete="organization" value="${esc(u.company||'')}"></div>
    <div class="fld wide"><label for="q-topic">What is this about?</label><select id="q-topic" name="topic">${['Product question','Trade account','Bulk quote','Order help','Other'].map(t=>`<option${(isQuote&&t==='Bulk quote')?' selected':''}>${t}</option>`).join('')}</select></div>
    <div class="fld wide"><label for="q-msg">Message</label><textarea id="q-msg" name="message" rows="5" required placeholder="${isQuote?'Which pieces, how many, and when do you need them?':'How can we help?'}"></textarea></div>
   </div>
   <p class="formerr" role="alert" id="q-err"></p>
   <button class="btn" type="submit">${isQuote?'Send quote request':'Send message'}</button>
  </form>
  ${isQuote?'':`<h2>Customer care</h2><p>Email: <b>${esc(CFG.contact.email)}</b><br>Phone: <b>${esc(CFG.contact.phone)}</b><br>${esc(CFG.contact.hours)}</p><p class="hint">We are an online-only store and do not have a walk-in showroom.</p>`}</div></section>`;
}

/* ============ CHECKOUT PARTS ============ */
function updateDelivery(){
  const box=$('#deliveryOptions');if(!box)return;
  const t=totals(),c=state.co;
  if(!c.province){box.innerHTML='<p class="hint">Select your province to see delivery options.</p>';return}
  box.innerHTML=t.opts.map(o=>`<label class="choice"><input type="radio" name="del" value="${o.id}" data-k="delivery" ${o.id===c.delivery?'checked':''}><span class="t"><b>${o.name}</b><small>${o.days} working days after dispatch</small></span><span class="p">${o.price===0?`Free <s style="color:var(--muted);font-weight:400">${R(o.was)}</s>`:R(o.price)}</span></label>`).join('');
}
function updateSummary(){
  const box=$('#summary');if(!box)return;
  const t=totals();
  box.innerHTML='<h2>Order summary</h2>'+t.lines.map(l=>{const p=BY[l.id];return `<div class="sl"><div class="th">${pic(p,l.ci)}</div><div>${esc(p.name)}<small>${esc(l.color)} · Qty ${l.qty}</small></div><div>${R(l.line)}</div></div>`}).join('')+
  `<div style="margin-top:14px"><div class="row"><span>Subtotal</span><span>${R(t.sub)}</span></div>
   ${t.saved>0?`<div class="row" style="color:var(--teal-deep)"><span>Trade pricing saved you</span><span>${R(t.saved)}</span></div>`:''}
   <div class="row"><span>Delivery</span><span>${t.ship===null?'Choose province':t.ship===0?'Free':R(t.ship)}</span></div>
   ${t.wrap?`<div class="row"><span>Gift wrap</span><span>${R(t.wrap)}</span></div>`:''}
   <div class="row total"><span>Total</span><span>${R(t.total)}</span></div>
   ${CFG.vatRegistered?`<p class="hint">Includes VAT of ${R(t.vat)}</p>`:''}</div>`;
}
function prefillCheckout(){
  const c=state.co,u=state.user;if(!u)return;
  if(!c.email)c.email=u.email;if(!c.phone)c.phone=u.phone||'';
  const a=u.address;
  if(a&&!c.street){c.first=a.first;c.last=a.last;c.company=a.company||u.company||'';c.street=a.street;c.suburb=a.suburb;c.city=a.city;c.province=a.province;c.postal=a.postal;if(!c.phone)c.phone=a.phone||''}
  else{const parts=u.name.split(' ');if(!c.first)c.first=parts[0]||'';if(!c.last)c.last=parts.slice(1).join(' ');if(!c.company)c.company=u.company||''}
}
function validateCo(){
  const c=state.co,e={};
  if(!/^\S+@\S+\.\S+$/.test(c.email.trim()))e.email='Enter a valid email address.';
  if(c.phone.replace(/\D/g,'').length<9)e.phone='Enter a mobile number the courier can call.';
  [['first','first name'],['last','last name'],['street','street address'],['suburb','suburb'],['city','city or town']].forEach(([k,n])=>{if(!c[k].trim())e[k]='Enter your '+n+'.'});
  if(!c.province)e.province='Choose your province.';
  if(!/^\d{4}$/.test(c.postal.trim()))e.postal='Enter the 4-digit postal code.';
  if(!c.terms)e.terms='Please accept the policy to continue.';
  return e;
}
function showErrors(e){
  $$('.err').forEach(n=>n.textContent='');
  let first=null;
  Object.keys(e).forEach(k=>{const n=$('#e-'+k);if(n){n.textContent=e[k];if(!first)first=k}});
  if(first){const el=$('#f-'+first);el&&el.focus()}
}
function orderPayload(extra){
  const c=state.co;
  return Object.assign({items:state.cart.map(l=>({id:l.id,ci:l.ci,qty:l.qty})),email:c.email.trim(),phone:c.phone.trim(),
    address:{first:c.first.trim(),last:c.last.trim(),company:c.company.trim(),street:c.street.trim(),suburb:c.suburb.trim(),city:c.city.trim(),province:c.province,postal:c.postal.trim()},
    delivery:c.delivery,giftWrap:c.giftWrap,giftMsg:c.giftMsg.trim(),payment:c.payment,po:c.po.trim(),notes:c.notes.trim()},extra||{});
}
async function placeOrder(){
  const err=$('#co-err');if(err)err.textContent='';
  if(!state.cart.length){toast('Your cart is empty');return}
  const e=validateCo();showErrors(e);if(Object.keys(e).length)return;
  const t=totals();if(!t.opt){if(err)err.textContent='Choose a delivery method.';return}
  if(state.co.payment==='payfast'&&api.mode==='preview'){openPayDemo();return}
  await submitOrder({});
}
async function submitOrder(extra){
  const btn=$('#placeBtn'),err=$('#co-err');
  if(btn){btn.disabled=true;btn.textContent='Placing your order…'}
  try{
    const r=await B.placeOrder(orderPayload(extra));
    state.order=r.order;kv.set('aura.order',r.order);
    state.cart=[];saveCart();renderCart();
    const keep={email:state.co.email,phone:state.co.phone};state.co=Object.assign({},emptyCo,keep);
    closePay();
    if(r.payfast){postForm(r.payfast);return}
    if(location.hash==='#order')render();else location.hash='order';
  }catch(ex){
    closePay();
    if(btn){btn.disabled=false;btn.textContent='Place order'}
    if(err)err.textContent=ex.message;else toast(ex.message);
  }
}
function postForm(pf){
  const f=document.createElement('form');f.method='POST';f.action=pf.url;
  pf.fields.forEach(x=>{const i=document.createElement('input');i.type='hidden';i.name=x.name;i.value=x.value;f.appendChild(i)});
  document.body.appendChild(f);f.submit();
}
function openPayDemo(){
  const t=totals();
  $('#payBox').innerHTML=`<h2>Pay ${R(t.total)}</h2><p><b>Preview mode.</b> You will not be charged. On the live store this step hands you over to PayFast to pay securely by card or instant EFT.</p>
    <div class="acts"><button class="btn" data-act="pay-confirm" id="payGo">Complete preview payment</button><button class="btn ghost" data-act="pay-cancel">Back to checkout</button></div>`;
  $('#payModal').classList.add('open');setTimeout(()=>{const b=$('#payGo');b&&b.focus()},30);
}
function closePay(){$('#payModal').classList.remove('open')}

/* ============ ACCOUNT + ADMIN LOADERS ============ */
async function loadOrders(){
  const box=$('#ordList');if(!box)return;
  try{
    const list=await B.myOrders();
    if(!$('#ordList'))return;
    if(!list.length){box.innerHTML='<div class="empty"><p>You have not placed any orders yet.</p><p style="margin-top:16px"><a class="btn" href="#shop">Start shopping</a></p></div>';return}
    window.__orders=list;
    const cls=s=>'s-'+String(s).toLowerCase().split(' ')[0];
    box.innerHTML=list.map((o,i)=>`<article class="ord"><div class="ord-top"><div><span class="ref2">${esc(o.ref)}</span><div class="hint">${fdate(o.date)}</div></div><span class="stat ${cls(o.status)}">${esc(o.status)}</span></div>
      <ul>${o.items.map(it=>`<li>${it.qty} × ${esc(it.name)} (${esc(it.color)})</li>`).join('')}</ul>
      <div class="ord-foot"><b>${R(o.total)}</b><span class="hint">${esc(o.payName)}</span><button class="btn sm ghost" data-act="reorder" data-i="${i}">Reorder</button></div></article>`).join('');
  }catch(e){box.innerHTML='<div class="notice bad">'+esc(e.message)+'</div>'}
}
const sel=(opts,cur,attrs)=>`<select ${attrs}>${opts.map(o=>`<option${o===cur?' selected':''}>${o}</option>`).join('')}</select>`;
const ORDER_STATUSES=['Awaiting payment','Awaiting invoice','Paid','Processing','Dispatched','Delivered','Cancelled'];
async function loadAdmin(){
  const box=$('#admBody');if(!box)return;
  const cls=s=>'s-'+String(s).toLowerCase().split(' ')[0];
  try{
    if(state.admTab==='orders'){
      const list=await B.adminOrders();if(!$('#admBody'))return;
      box.innerHTML=list.length?`<div class="tbl"><table class="adm-tbl"><thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Payment</th><th>Status</th></tr></thead><tbody>${list.map(o=>`<tr><td><b>${esc(o.ref)}</b><small>${fdate(o.date)}</small>${o.po?`<small>PO: ${esc(o.po)}</small>`:''}</td>
        <td>${esc(o.address.first)} ${esc(o.address.last)}${o.address.company?`<small>${esc(o.address.company)}</small>`:''}<small>${esc(o.email)} · ${esc(o.address.phone||'')}</small>
        <details><summary style="font-size:.8rem">Items and address</summary><ul class="qitems">${o.items.map(i=>`<li>${i.qty} × ${esc(i.name)} (${esc(i.color)})</li>`).join('')}</ul><p class="hint" style="margin-top:8px">${esc(o.deliveryName)}<br>${esc(o.address.street)}, ${esc(o.address.suburb)}, ${esc(o.address.city)}, ${esc(o.address.province)} ${esc(o.address.postal)}${o.notes?'<br>Notes: '+esc(o.notes):''}${o.giftMsg?'<br>Gift message: '+esc(o.giftMsg):''}</p></details></td>
        <td>${R(o.total)}${o.tradePricing?'<small>Trade pricing</small>':''}</td><td>${esc(o.payName)}</td>
        <td>${sel(ORDER_STATUSES,o.status,`data-chg="order" data-id="${o.id}" aria-label="Order status"`)}</td></tr>`).join('')}</tbody></table></div>`:'<p class="hint">No orders yet.</p>';
    }else if(state.admTab==='customers'){
      const list=await B.adminCustomers();if(!$('#admBody'))return;
      box.innerHTML=`<p class="adm-note">Approve a trade account to switch on trade pricing and pay on account for that customer.</p><div class="tbl"><table class="adm-tbl"><thead><tr><th>Customer</th><th>Business</th><th>Type</th><th>Trade status</th></tr></thead><tbody>${list.map(u=>`<tr><td><b>${esc(u.name)}</b><small>${esc(u.email)}</small><small>${esc(u.phone||'')}</small></td><td>${esc(u.company||'')}<small>${esc(u.bizType||'')}</small>${u.vat?`<small>VAT/Reg: ${esc(u.vat)}</small>`:''}</td><td>${u.role==='admin'?'Admin':u.accountType==='trade'?'Trade':'Personal'}</td>
        <td>${u.role==='admin'?'':sel(['none','pending','approved','rejected'],u.tradeStatus,`data-chg="customer" data-id="${u.id}" aria-label="Trade status"`)}</td></tr>`).join('')}</tbody></table></div>`;
    }else{
      const list=await B.adminEnquiries();if(!$('#admBody'))return;
      box.innerHTML=list.length?list.map(e=>`<article class="ord"><div class="ord-top"><div><b>${esc(e.name)}</b>${e.company?' · '+esc(e.company):''}<div class="hint">${esc(e.email)}${e.phone?' · '+esc(e.phone):''} · ${esc(e.topic||'')} · ${fdate(e.createdAt)}</div></div>${sel(['New','In progress','Done'],e.status,`data-chg="enquiry" data-id="${e.id}" aria-label="Enquiry status"`)}</div>
        <p style="margin-top:10px;white-space:pre-wrap">${esc(e.message)}</p>${(e.items&&e.items.length)?`<ul class="qitems">${e.items.map(i=>`<li>${i.qty} × ${esc(i.name)}</li>`).join('')}</ul>`:''}</article>`).join(''):'<p class="hint">No enquiries yet.</p>';
    }
  }catch(e){box.innerHTML='<div class="notice bad">'+esc(e.message)+'</div>'}
}

/* ============ ROUTER ============ */
function route(){
  const h=location.hash.replace(/^#/,'');
  if(!h||h==='home')return{name:'home'};
  if(h==='shop')return{name:'shop',cat:null};
  if(h.indexOf('cat-')===0){const c=catOf(h.slice(4));return{name:'shop',cat:c?c.id:null}}
  if(h.indexOf('p-')===0){const p=BY[h.slice(2)];return p?{name:'product',p:p}:{name:'home'}}
  if(['checkout','order','delivery','about','contact','search','account','trade','quote','admin','privacy'].indexOf(h)>-1)return{name:h};
  return{name:'home'};
}
let lastKey='';
function render(keepScroll){
  const r=route(),key=r.name+(r.cat||'')+(r.p?r.p.id:'');
  if(r.name==='product'&&lastKey!==key)state.pd={ci:0,qty:1,ph:0};
  if(lastKey!==key&&r.name!=='contact'&&r.name!=='quote')state.sent=null;
  lastKey=key;
  if(r.name==='checkout')prefillCheckout();
  const y=window.scrollY;
  $('#app').innerHTML=views[r.name](r);
  const T={home:'Aura & Co.',shop:r.cat?(catOf(r.cat).name+' | Aura & Co.'):'Shop | Aura & Co.',product:r.p?(r.p.name+' | Aura & Co.'):'',checkout:'Checkout | Aura & Co.',order:'Order confirmed | Aura & Co.',delivery:'Delivery & returns | Aura & Co.',about:'About | Aura & Co.',contact:'Contact | Aura & Co.',search:'Search | Aura & Co.',account:'My account | Aura & Co.',trade:'Trade accounts | Aura & Co.',quote:'Request a quote | Aura & Co.',admin:'Admin | Aura & Co.',privacy:'Privacy | Aura & Co.'};
  document.title=T[r.name]||'Aura & Co.';
  if(r.name==='checkout'){updateDelivery();updateSummary()}
  if(r.name==='account'&&state.user&&state.accTab==='orders')loadOrders();
  if(r.name==='admin'&&state.user&&state.user.role==='admin')loadAdmin();
  window.scrollTo(0,keepScroll===true?y:0);
  $('#mainNav').classList.remove('open');
  const dot=$('#acctDot');if(dot)dot.hidden=!state.user;
}

/* ============ EVENTS ============ */
document.addEventListener('click',async function(ev){
  const t=ev.target.closest('[data-act]');if(!t)return;
  const a=t.dataset.act;
  if(a==='add'){addToCart(t.dataset.id,0,1);openCart()}
  else if(a==='add-pd'){const p=BY[t.dataset.id];addToCart(p.id,Math.min(state.pd.ci,p.colors.length-1),state.pd.qty);openCart()}
  else if(a==='open-cart')openCart();
  else if(a==='close-cart')closeCart();
  else if(a==='qty'){const i=+t.dataset.i,d=+t.dataset.d,l=state.cart[i];if(l){l.qty=Math.min(99,l.qty+d);if(l.qty<1)state.cart.splice(i,1);saveCart();renderCart();if(route().name==='checkout')updateSummary()}}
  else if(a==='remove'){state.cart.splice(+t.dataset.i,1);saveCart();renderCart();if(route().name==='checkout')render(true)}
  else if(a==='pick-photo'){const r=route();if(r.p){const ph=photosOf(r.p);state.pd.ph=+t.dataset.i;const im=$('#pdMain img');if(im)im.src=ph[state.pd.ph];$$('[data-act="pick-photo"]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.i===state.pd.ph)))}}
  else if(a==='pick-color'){const r=route();if(r.p){state.pd.ci=+t.dataset.ci;const p=r.p,ci=state.pd.ci;if(!photosOf(p).length){$('#pdMain').innerHTML=pic(p,ci);$('#pdMain').setAttribute('aria-label',p.name+', '+p.colors[ci].name)}const cn=$('#colName');if(cn)cn.textContent=p.colors[ci].name;$$('[data-act="pick-color"]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.ci===ci)))}}
  else if(a==='pd-qty'){state.pd.qty=Math.max(1,Math.min(99,state.pd.qty+(+t.dataset.d)));$('#pdQty').textContent=state.pd.qty}
  else if(a==='toggle-menu'){const n=$('#mainNav');const o=n.classList.toggle('open');t.setAttribute('aria-expanded',o)}
  else if(a==='toggle-search'){const row=$('#searchRow');row.classList.toggle('open');if(row.classList.contains('open'))$('#searchInput').focus()}
  else if(a==='pay-confirm'){await submitOrder({demoPaid:true})}
  else if(a==='pay-cancel')closePay();
  else if(a==='go-register'){state.regType='trade'}
  else if(a==='logout'){try{await B.logout()}catch(e){}state.user=null;state.co=Object.assign({},emptyCo);render();renderCart();toast('You have signed out')}
  else if(a==='acc-tab'){state.accTab=t.dataset.t;render(true)}
  else if(a==='adm-tab'){state.admTab=t.dataset.t;render(true)}
  else if(a==='clear-sent'){state.sent=null}
  else if(a==='reorder'){
    const o=(window.__orders||[])[+t.dataset.i];if(!o)return;let n=0;
    o.items.forEach(i=>{if(i.id&&BY[i.id]&&BY[i.id].colors[i.ci]){addToCart(i.id,i.ci,i.qty);n++}});
    if(n){openCart()}else toast('Those items are no longer available')
  }
});
document.addEventListener('keydown',function(ev){
  if(ev.key==='Escape'){closeCart();closePay()}
  if(ev.key==='Enter'&&ev.target.id==='searchInput'){state.q=ev.target.value;if(location.hash==='#search')render();else location.hash='search'}
});
document.addEventListener('change',async function(ev){
  const t=ev.target;
  if(t.id==='sort'){state.sort=t.value;render(true);return}
  if(t.name==='accountType'&&t.closest('[data-form="register"]')){state.regType=t.value;$$('.biz').forEach(n=>n.hidden=t.value!=='trade');return}
  if(t.dataset&&t.dataset.chg){
    const id=+t.dataset.id;
    try{
      if(t.dataset.chg==='order')await B.adminSetOrder(id,t.value);
      else if(t.dataset.chg==='customer')await B.adminSetCustomer(id,t.value);
      else await B.adminSetEnquiry(id,t.value);
      toast('Saved');
    }catch(e){toast(e.message);loadAdmin()}
    return;
  }
  if(!t.dataset||!t.dataset.k)return;
  const k=t.dataset.k;
  state.co[k]=t.type==='checkbox'?t.checked:t.value;
  if(k==='province'){updateDelivery();updateSummary()}
  else if(k==='delivery'||k==='giftWrap')updateSummary();
});
document.addEventListener('input',function(ev){
  const t=ev.target;if(!t.dataset||!t.dataset.k)return;
  if(t.type==='checkbox'||t.type==='radio'||t.tagName==='SELECT')return;
  state.co[t.dataset.k]=t.value;
  const n=$('#e-'+t.dataset.k);if(n)n.textContent='';
});
document.addEventListener('submit',async function(ev){
  const f=ev.target.closest('form[data-form]');if(!f)return;
  ev.preventDefault();
  const kind=f.dataset.form,fd=Object.fromEntries(new FormData(f).entries()),btn=f.querySelector('button[type="submit"]');
  const setErr=(id,m)=>{const e=$('#'+id);if(e)e.textContent=m};
  if(kind==='checkout'){await placeOrder();return}
  if(btn)btn.disabled=true;
  try{
    if(kind==='login'){
      setErr('l-err','');state.user=await B.login(fd.email,fd.password);
      afterAuth('Welcome back, '+state.user.name.split(' ')[0]);
    }else if(kind==='register'){
      setErr('r-err','');
      if(!fd.consent){throw new Error('Please accept the policies to create your account.')}
      state.user=await B.register(fd);
      afterAuth(state.user.accountType==='trade'?'Account created. Your trade application is under review.':'Account created. Welcome to Aura & Co.');
    }else if(kind==='enquiry'){
      setErr('q-err','');
      const items=route().name==='quote'?state.cart.map(l=>({id:l.id,qty:l.qty})):[];
      await B.sendEnquiry(Object.assign({},fd,{items:items}));
      state.sent={email:fd.email};render();
    }
  }catch(e){
    setErr(kind==='login'?'l-err':kind==='register'?'r-err':'q-err',e.message);
  }finally{if(btn)btn.disabled=false}
});
function afterAuth(msg){
  state.co=Object.assign({},emptyCo);
  renderCart();render();toast(msg);
}
window.addEventListener('hashchange',()=>render());

/* ============ SHELL + BOOT ============ */
function shell(){
  $('#announce').textContent='FREE STANDARD DELIVERY ON ORDERS OVER '+R(CFG.freeDeliveryOver)+' · TRADE ACCOUNTS WELCOME';
  $('#menuCats').innerHTML=CATS.map(c=>`<a href="#cat-${c.id}">${c.name}</a>`).join('');
  $('#footCats').innerHTML=CATS.map(c=>`<a href="#cat-${c.id}">${c.name}</a>`).join('');
  $('#footContact').innerHTML=`<a href="#contact">${esc(CFG.contact.email)}</a><a href="#contact">${esc(CFG.contact.phone)}</a><p style="margin-top:6px">${esc(CFG.contact.hours)}</p>`;
  $('#vatNote').textContent=CFG.vatRegistered?'All prices in South African rand and include VAT.':'All prices in South African rand.';
  const bar=$('#demoBar');
  if(api.mode==='preview'){bar.hidden=false;bar.textContent='Preview mode: accounts, orders and enquiries are saved only in this browser. No real payments are taken.'}else bar.hidden=true;
}
shell();renderCart();render();
(async function boot(){
  const server=await detectServer();
  api.mode=server?'server':'preview';B=server?SRV:MOCK;
  try{const c=await B.config();CFG=Object.assign({},CFG,c)}catch(e){}
  try{Object.assign(IMG,await B.images())}catch(e){}
  try{state.user=await B.me()}catch(e){state.user=null}
  if(state.user)state.co.email=state.co.email||state.user.email;
  shell();renderCart();render(true);
})();
})();
