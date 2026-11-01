/* ============ PRODUCT ILLUSTRATIONS (original, drawn in code) ============ */
const hex2=h=>{h=h.replace('#','');return [0,2,4].map(i=>parseInt(h.substr(i,2),16))};
const mix=(a,b,t)=>{const A=hex2(a),B=hex2(b);return '#'+A.map((v,i)=>Math.round(v+(B[i]-v)*t).toString(16).padStart(2,'0')).join('')};
const lighten=(c,t)=>mix(c,'#ffffff',t), darken=(c,t)=>mix(c,'#000000',t);
let G=0;
function art(kind,c,v,wall){
  v=v||0;const id='a'+(++G);
  const hi=lighten(c,.4),lo=darken(c,.2),deep=darken(c,.42);
  const W=wall||'#E6EEEA',bgA=mix(W,'#ffffff',.5),bgB=W,flr=darken(W,.09),flr2=darken(W,.2);
  const defs=`<defs><linearGradient id="${id}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${bgA}"/><stop offset="1" stop-color="${bgB}"/></linearGradient>
<linearGradient id="${id}f" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${hi}"/><stop offset=".5" stop-color="${c}"/><stop offset="1" stop-color="${lo}"/></linearGradient>
<linearGradient id="${id}v" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${hi}"/><stop offset="1" stop-color="${lo}"/></linearGradient>
<radialGradient id="${id}r" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="${hi}"/><stop offset=".55" stop-color="${c}"/><stop offset="1" stop-color="${lo}"/></radialGradient></defs>`;
  const F=`url(#${id}f)`,V=`url(#${id}v)`,Rd=`url(#${id}r)`;
  const clip=(d,inner)=>{const k=id+'k'+(++G);return `<clipPath id="${k}"><path d="${d}"/></clipPath><g clip-path="url(#${k})">${inner}</g>`};
  const tint=mix(c,'#C9D1C7',.6);
  let b='';
  switch(kind){
  case 'vase':{
    const d='M265 140H335C335 190 340 215 370 250C410 295 415 350 405 400C395 445 370 470 340 470H260C230 470 205 445 195 400C185 350 190 295 230 250C260 215 265 190 265 140Z';
    let ribs='';if(v%2===0){for(let y=250;y<=450;y+=26)ribs+=`<path d="M170 ${y}Q300 ${y+16} 430 ${y}" stroke="${lo}" stroke-opacity=".3" stroke-width="5" fill="none"/>`}
    b=`<path d="${d}" fill="${F}"/>${clip(d,ribs)}<ellipse cx="300" cy="140" rx="35" ry="8" fill="${deep}" opacity=".5"/><path d="M232 300C222 340 224 380 232 420" stroke="#fff" stroke-opacity=".3" stroke-width="8" fill="none" stroke-linecap="round"/>`;break}
  case 'planter':{
    const g1='#6F8F78',g2='#587562';let lv='';
    [-62,-38,-14,12,36,60].forEach((a,i)=>{lv+=`<g transform="rotate(${a} 300 326)"><path d="M300 326C262 262 258 192 300 120C342 192 338 262 300 326Z" fill="${i%2?g1:g2}"/><path d="M300 320V150" stroke="#fff" stroke-opacity=".25" stroke-width="3"/></g>`});
    b=lv+`<path d="M215 335H385L368 470H232Z" fill="${F}"/><rect x="204" y="318" width="192" height="28" rx="8" fill="${lo}"/><path d="M240 362V452" stroke="#fff" stroke-opacity=".3" stroke-width="7" stroke-linecap="round"/>`;break}
  case 'lamp':
    b=`<rect x="294" y="296" width="12" height="140" fill="${deep}"/><path d="M238 470C238 438 268 424 300 424C332 424 362 438 362 470Z" fill="${V}"/><path d="M236 146H364L400 298H200Z" fill="${F}"/><path d="M236 146H364L400 298H200Z" fill="#FFF1CF" opacity=".22"/><ellipse cx="300" cy="146" rx="64" ry="9" fill="${hi}"/>`;break;
  case 'stems':{
    let s='';[-30,-15,0,15,30].forEach((a,i)=>{const top=120+(i%2)*34;
      let inner=`<line x1="300" y1="390" x2="300" y2="${top}" stroke="#7B8B6A" stroke-width="4" stroke-linecap="round"/>`;
      if(v===0){for(let y=top+10;y<380;y+=30){inner+=`<ellipse cx="288" cy="${y}" rx="22" ry="7" fill="#7F9A82" transform="rotate(-28 288 ${y})"/><ellipse cx="312" cy="${y+12}" rx="22" ry="7" fill="#6E8B73" transform="rotate(28 312 ${y+12})"/>`}}
      else{inner+=`<ellipse cx="300" cy="${top+40}" rx="22" ry="80" fill="${hi}" opacity=".9"/><ellipse cx="300" cy="${top+50}" rx="11" ry="62" fill="#fff" opacity=".4"/>`}
      s+=`<g transform="rotate(${a} 300 390)">${inner}</g>`});
    b=s+`<path d="M258 384H342L330 470H270Z" fill="${F}"/><rect x="250" y="372" width="100" height="18" rx="6" fill="${lo}"/>`;break}
  case 'cushion':{
    const d='M125 195Q300 165 475 195Q492 330 475 465Q300 495 125 465Q108 330 125 195Z';let pat='';
    if(v===1){for(let x=140;x<470;x+=34)pat+=`<path d="M${x} 170V500" stroke="${hi}" stroke-opacity=".6" stroke-width="12"/>`}
    else if(v===2){for(let x=150;x<470;x+=30)pat+=`<path d="M${x} 190Q${x+12} 330 ${x} 470" stroke="${lo}" stroke-opacity=".35" stroke-width="5" fill="none"/>`}
    else if(v===3){for(let r=30;r<=150;r+=30)pat+=`<circle cx="300" cy="330" r="${r}" fill="none" stroke="${lo}" stroke-opacity=".35" stroke-width="5"/>`}
    else if(v===4){for(let i=-6;i<9;i++)pat+=`<path d="M${i*60} 150L${i*60+260} 520M${i*60+260} 150L${i*60} 520" stroke="${lo}" stroke-opacity=".22" stroke-width="3"/>`}
    b=`<path d="${d}" fill="${F}"/>${clip(d,pat)}<path d="M150 218Q300 194 450 218" stroke="#fff" stroke-opacity=".35" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M146 440Q300 464 454 440" stroke="${deep}" stroke-opacity=".2" stroke-width="6" fill="none"/>`;break}
  case 'arch':
    b=`<path d="M190 470V300A110 110 0 0 1 410 300V470H345V315A45 45 0 0 0 255 315V470Z" fill="${F}"/><path d="M205 440V300A95 95 0 0 1 300 205" stroke="#fff" stroke-opacity=".3" stroke-width="7" fill="none" stroke-linecap="round"/>`;break;
  case 'pebbles':
    b=`<ellipse cx="300" cy="438" rx="125" ry="38" fill="${lo}"/><ellipse cx="300" cy="430" rx="125" ry="38" fill="${Rd}"/><ellipse cx="308" cy="372" rx="92" ry="31" fill="${Rd}"/><ellipse cx="298" cy="322" rx="62" ry="25" fill="${Rd}"/>`;break;
  case 'orb':
    b=`<rect x="236" y="404" width="128" height="66" fill="${mix(c,'#3A4742',.55)}"/><rect x="236" y="404" width="128" height="10" fill="${mix(c,'#3A4742',.3)}"/><circle cx="300" cy="312" r="98" fill="${Rd}"/><ellipse cx="262" cy="270" rx="22" ry="34" fill="#fff" opacity=".28" transform="rotate(35 262 270)"/>`;break;
  case 'ribbon':{
    const p='M190 470C190 372 410 392 410 286C410 200 316 176 262 226';
    b=`<path d="${p}" fill="none" stroke="${lo}" stroke-width="54" stroke-linecap="round"/><path d="${p}" fill="none" stroke="${c}" stroke-width="42" stroke-linecap="round"/><path d="${p}" fill="none" stroke="#fff" stroke-opacity=".32" stroke-width="8" stroke-linecap="round" transform="translate(-9 -9)"/>`;break}
  case 'bust':
    b=`<path d="M165 470C165 392 218 360 300 360C382 360 435 392 435 470Z" fill="${F}"/><rect x="272" y="296" width="56" height="80" fill="${lo}"/><ellipse cx="300" cy="244" rx="56" ry="72" fill="${Rd}"/><path d="M262 220C255 250 258 280 272 300" stroke="#fff" stroke-opacity=".3" stroke-width="7" fill="none" stroke-linecap="round"/>`;break;
  case 'bowl':{
    const d='M140 290H460C460 400 400 470 300 470C200 470 140 400 140 290Z';
    b=`<path d="${d}" fill="${V}"/>${clip(d,`<path d="M120 372H480" stroke="${deep}" stroke-opacity=".22" stroke-width="12"/><path d="M120 392H480" stroke="${hi}" stroke-opacity=".35" stroke-width="5"/>`)}<ellipse cx="300" cy="290" rx="160" ry="28" fill="${hi}"/><ellipse cx="300" cy="294" rx="146" ry="21" fill="${lo}"/>`;break}
  case 'jug':
    b=`<path d="M392 252C476 250 476 388 394 392" fill="none" stroke="${lo}" stroke-width="28" stroke-linecap="round"/><path d="M205 196H385C412 262 428 330 416 400C410 448 384 470 352 470H238C206 470 190 448 186 400C176 330 188 262 205 196Z" fill="${F}"/><ellipse cx="295" cy="196" rx="90" ry="14" fill="${deep}" opacity=".55"/><path d="M222 260C210 320 212 380 224 430" stroke="#fff" stroke-opacity=".32" stroke-width="8" fill="none" stroke-linecap="round"/>`;break;
  case 'mug':{
    const mug=(x,y,w,h)=>`<path d="M${x+w-4} ${y+h*.22}c${w*.46} 0 ${w*.46} ${h*.5} 0 ${h*.54}" fill="none" stroke="${lo}" stroke-width="16" stroke-linecap="round"/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="16" fill="${F}"/><ellipse cx="${x+w/2}" cy="${y}" rx="${w/2}" ry="9" fill="${deep}" opacity=".5"/>`;
    b=mug(138,300,142,170)+mug(310,340,128,130);break}
  case 'board':
    b=`<g transform="rotate(-9 300 340)"><rect x="124" y="250" width="352" height="180" rx="28" fill="${lo}"/><rect x="124" y="244" width="352" height="180" rx="28" fill="${F}"/><circle cx="168" cy="334" r="15" fill="${mix(c,'#F7F8F4',.82)}"/><path d="M220 280C300 268 380 290 450 276M220 320C300 308 380 330 450 316M220 362C300 350 380 372 450 358M220 396C300 388 380 404 450 394" stroke="${deep}" stroke-opacity=".22" stroke-width="3" fill="none"/></g>`;break;
  case 'canister':
    b=`<rect x="160" y="236" width="150" height="234" rx="16" fill="${F}"/><rect x="152" y="212" width="166" height="34" rx="10" fill="${lo}"/><rect x="215" y="192" width="40" height="22" rx="8" fill="${deep}"/><rect x="334" y="316" width="112" height="154" rx="14" fill="${V}"/><rect x="328" y="296" width="124" height="28" rx="9" fill="${lo}"/><rect x="372" y="280" width="36" height="18" rx="7" fill="${deep}"/><path d="M180 270V440" stroke="#fff" stroke-opacity=".3" stroke-width="7" stroke-linecap="round"/>`;break;
  case 'mirror':
    b=`<circle cx="300" cy="300" r="172" fill="${F}"/><circle cx="300" cy="300" r="150" fill="${lo}"/><circle cx="300" cy="300" r="146" fill="#E8EEEC"/><circle cx="300" cy="300" r="146" fill="#B9C9C6" opacity=".35"/><path d="M200 230L330 160L360 190L226 270Z" fill="#fff" opacity=".42"/><path d="M250 380L390 300L400 322L270 400Z" fill="#fff" opacity=".22"/>`;break;
  case 'basket':{
    const d='M150 270H450C462 380 410 470 300 470C190 470 138 380 150 270Z';let w='';
    for(let y=290;y<470;y+=20)w+=`<path d="M120 ${y}Q300 ${y+16} 480 ${y}" stroke="${deep}" stroke-opacity=".28" stroke-width="4" fill="none"/>`;
    for(let x=170;x<440;x+=26)w+=`<path d="M${x} 270V470" stroke="${deep}" stroke-opacity=".18" stroke-width="3"/>`;
    b=`<path d="M200 262C230 200 370 200 400 262" fill="${mix(c,'#E7DFCF',.6)}"/><path d="${d}" fill="${F}"/>${clip(d,w)}<ellipse cx="300" cy="270" rx="150" ry="22" fill="${hi}"/><ellipse cx="300" cy="274" rx="136" ry="16" fill="${deep}" opacity=".5"/>`;break}
  case 'tray':{
    if(v===1){b=`<rect x="96" y="318" width="408" height="60" rx="10" fill="${lo}"/><rect x="96" y="304" width="408" height="60" rx="10" fill="${F}"/><rect x="120" y="318" width="360" height="30" rx="6" fill="${lo}" opacity=".45"/><rect x="190" y="250" width="70" height="60" rx="10" fill="#E9E1D1"/><rect x="330" y="236" width="60" height="74" rx="8" fill="#B9C6BE"/><rect x="150" y="364" width="300" height="106" rx="6" fill="${lo}"/>`}
    else{const d='M130 240H470Q500 240 500 270V430Q500 460 470 460H130Q100 460 100 430V270Q100 240 130 240Z';
      b=`<path d="${d}" fill="${V}"/>${clip(d,`<path d="M110 300C200 270 260 360 340 330S440 300 510 340M180 240C200 320 240 400 250 470M360 240C340 300 380 380 420 470" stroke="${deep}" stroke-opacity=".3" stroke-width="3" fill="none"/>`)}<rect x="122" y="262" width="356" height="176" rx="14" fill="none" stroke="${deep}" stroke-opacity=".25" stroke-width="3"/><rect x="82" y="320" width="26" height="64" rx="13" fill="${lo}"/><rect x="492" y="320" width="26" height="64" rx="13" fill="${lo}"/><rect x="200" y="300" width="84" height="84" rx="14" fill="#E9E1D1"/><circle cx="380" cy="360" r="42" fill="#B9C6BE"/>`}
    break}
  case 'throw':
    b=`<rect x="108" y="404" width="384" height="68" rx="10" fill="${lo}"/><rect x="120" y="340" width="360" height="72" rx="10" fill="${V}"/><rect x="136" y="274" width="328" height="74" rx="10" fill="${F}"/><path d="M136 300H464M136 322H464" stroke="${deep}" stroke-opacity=".25" stroke-width="3"/><path d="M120 366H480M120 388H480" stroke="${hi}" stroke-opacity=".55" stroke-width="3"/>`+Array.from({length:14},(_,i)=>`<path d="M${480+(i%2)*0} ${344+i*4.6}h14" stroke="${lo}" stroke-width="3"/>`).join('');break;
  case 'kaftan':{
    const sil='M245 140L195 160L100 275L158 310L212 250L212 470H388L388 250L442 310L500 275L405 160L355 140Q300 190 245 140Z';
    let pl='';if(v===1){for(let x=214;x<390;x+=22)pl+=`<path d="M${x} 190V470" stroke="${lo}" stroke-opacity=".3" stroke-width="4"/>`}
    b=`<path d="${sil}" fill="${F}"/>${clip(sil,pl)}<path d="M245 140Q300 190 355 140Q300 168 245 140Z" fill="${deep}" opacity=".55"/><path d="M262 154L300 218L338 154" stroke="${lo}" stroke-width="4" fill="none"/><path d="M212 452H388" stroke="${deep}" stroke-opacity=".25" stroke-width="6"/>`;break}
  case 'robe':{
    const sil='M245 140L195 160L100 285L158 322L212 262L212 470H388L388 262L442 322L500 285L405 160L355 140Q300 200 245 140Z';
    b=`<path d="${sil}" fill="${F}"/>${clip(sil,Array.from({length:9},(_,i)=>`<path d="M${200+i*25} 150V470" stroke="${lo}" stroke-opacity=".22" stroke-width="3"/>`).join('')+Array.from({length:8},(_,i)=>`<path d="M200 ${180+i*40}H400" stroke="${lo}" stroke-opacity=".22" stroke-width="3"/>`).join(''))}<path d="M255 142L300 340M345 142L300 340" stroke="${hi}" stroke-width="7" fill="none"/><rect x="212" y="322" width="176" height="26" fill="${lo}"/><circle cx="300" cy="335" r="14" fill="${deep}"/><path d="M296 345L270 420M304 345L330 420" stroke="${deep}" stroke-width="8" stroke-linecap="round"/>`;break}
  case 'scarf':{
    const fringe=Array.from({length:10},(_,i)=>`<path d="M${126+i*8} ${296+i*0}v${12}" stroke="${deep}" stroke-opacity=".5" stroke-width="2"/>`).join('');
    if(v===1){b=`<path d="M130 210C230 160 380 280 478 214L504 330C400 396 236 270 140 330Z" fill="${F}"/><path d="M140 330C240 270 400 396 504 330L492 430C390 480 240 372 150 430Z" fill="${V}"/><path d="M130 210C230 160 380 280 478 214" stroke="#fff" stroke-opacity=".35" stroke-width="5" fill="none"/>`}
    else{b=`<path d="M120 190C220 140 380 260 480 200L500 300C400 360 240 240 130 300Z" fill="${F}"/><path d="M130 300C240 240 400 360 500 300L490 400C390 450 240 340 140 400Z" fill="${V}"/><path d="M120 190C220 140 380 260 480 200" stroke="#fff" stroke-opacity=".4" stroke-width="5" fill="none"/>${fringe}`}
    break}
  case 'pendant':{
    const teard=v===1;
    b=`<path d="M160 130Q300 450 440 130" fill="none" stroke="${c}" stroke-width="5" stroke-linecap="round"/><circle cx="300" cy="296" r="12" fill="none" stroke="${c}" stroke-width="5"/><circle cx="300" cy="352" r="50" fill="none" stroke="${F}" stroke-width="12"/><circle cx="300" cy="352" r="50" fill="none" stroke="#fff" stroke-opacity=".3" stroke-width="3" transform="translate(-4 -4)"/><circle cx="300" cy="352" r="6" fill="${c}"/>`;break}
  case 'hoops':
    b=`<circle cx="205" cy="330" r="86" fill="none" stroke="${F}" stroke-width="16"/><circle cx="395" cy="330" r="86" fill="none" stroke="${F}" stroke-width="16"/><circle cx="205" cy="330" r="86" fill="none" stroke="#fff" stroke-opacity=".3" stroke-width="3" stroke-dasharray="90 450" transform="rotate(-60 205 330)"/><circle cx="395" cy="330" r="86" fill="none" stroke="#fff" stroke-opacity=".3" stroke-width="3" stroke-dasharray="90 450" transform="rotate(-60 395 330)"/><circle cx="205" cy="246" r="9" fill="${lo}"/><circle cx="395" cy="246" r="9" fill="${lo}"/>`;break;
  case 'bangle':
    b=`<ellipse cx="300" cy="352" rx="178" ry="70" fill="none" stroke="${lo}" stroke-width="38"/><path d="M122 352A178 70 0 0 0 478 352" fill="none" stroke="${F}" stroke-width="36"/><path d="M122 352A178 70 0 0 1 478 352" fill="none" stroke="${hi}" stroke-width="30" stroke-dasharray="1 0"/><path d="M160 336Q300 280 440 336" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="5" stroke-linecap="round"/>`;break;
  case 'ring':
    b=`<circle cx="204" cy="388" r="62" fill="none" stroke="${F}" stroke-width="15"/><circle cx="396" cy="392" r="60" fill="none" stroke="${F}" stroke-width="15"/><circle cx="300" cy="354" r="72" fill="none" stroke="${F}" stroke-width="16"/><polygon points="300,246 326,274 300,302 274,274" fill="#F4F6F2" stroke="${lo}" stroke-width="3"/><polygon points="300,246 326,274 274,274" fill="#fff" opacity=".7"/>`;break;
  case 'drops':
    b=`<path d="M212 130v70M388 130v70" stroke="${deep}" stroke-width="5" stroke-linecap="round"/><circle cx="212" cy="206" r="10" fill="${deep}"/><circle cx="388" cy="206" r="10" fill="${deep}"/><circle cx="212" cy="290" r="64" fill="${Rd}"/><circle cx="388" cy="290" r="64" fill="${Rd}"/><ellipse cx="190" cy="266" rx="14" ry="20" fill="#fff" opacity=".5" transform="rotate(30 190 266)"/><ellipse cx="366" cy="266" rx="14" ry="20" fill="#fff" opacity=".5" transform="rotate(30 366 266)"/>`;break;
  case 'giftbox':{
    const rib=v===1?'#D9C39A':'#E9DDBF';
    b=`<rect x="150" y="288" width="300" height="182" rx="6" fill="${F}"/><rect x="132" y="244" width="336" height="54" rx="6" fill="${V}"/><rect x="282" y="244" width="36" height="226" fill="${rib}"/><ellipse cx="258" cy="216" rx="52" ry="26" fill="${rib}" transform="rotate(-24 258 216)"/><ellipse cx="342" cy="216" rx="52" ry="26" fill="${rib}" transform="rotate(24 342 216)"/><ellipse cx="258" cy="216" rx="30" ry="12" fill="${darken(rib,.12)}" transform="rotate(-24 258 216)"/><ellipse cx="342" cy="216" rx="30" ry="12" fill="${darken(rib,.12)}" transform="rotate(24 342 216)"/><circle cx="300" cy="228" r="17" fill="${darken(rib,.08)}"/>`;break}
  case 'candle':
    b=`<path d="M300 205C275 238 280 266 300 276C320 266 325 238 300 205Z" fill="#F2C879"/><path d="M300 236C290 252 292 266 300 270C308 266 310 252 300 236Z" fill="#FFF3D4"/><rect x="297" y="272" width="6" height="26" fill="#3A4742"/><rect x="200" y="296" width="200" height="174" rx="24" fill="${F}"/><ellipse cx="300" cy="298" rx="100" ry="14" fill="${hi}"/><rect x="236" y="364" width="128" height="72" rx="6" fill="#F7F4EC"/><rect x="256" y="382" width="88" height="6" fill="${deep}" opacity=".7"/><rect x="272" y="398" width="56" height="5" fill="${deep}" opacity=".4"/><rect x="262" y="412" width="76" height="5" fill="${deep}" opacity=".4"/>`;break;
  case 'diffuser':
    b=Array.from({length:6},(_,i)=>{const a=-26+i*10.4;return `<line x1="300" y1="246" x2="300" y2="82" stroke="#C7B189" stroke-width="5" stroke-linecap="round" transform="rotate(${a} 300 246)"/>`}).join('')+`<path d="M252 302Q252 270 280 262V238H320V262Q348 270 348 302V470H252Z" fill="${F}"/><rect x="278" y="232" width="44" height="14" rx="4" fill="${deep}"/><rect x="272" y="342" width="56" height="86" rx="4" fill="#F7F4EC"/><rect x="282" y="360" width="36" height="5" fill="${deep}" opacity=".6"/><rect x="286" y="374" width="28" height="4" fill="${deep}" opacity=".35"/><path d="M268 300V450" stroke="#fff" stroke-opacity=".35" stroke-width="6" stroke-linecap="round"/>`;break;
  case 'hamper':{
    const d='M150 330H450L420 470H180Z';let w='';
    for(let y=350;y<470;y+=18)w+=`<path d="M140 ${y}H460" stroke="${deep}" stroke-opacity=".28" stroke-width="4"/>`;
    for(let x=160;x<450;x+=28)w+=`<path d="M${x} 330L${x-12} 470" stroke="${deep}" stroke-opacity=".2" stroke-width="3"/>`;
    b=`<path d="M170 332C170 152 430 152 430 332" fill="none" stroke="${deep}" stroke-width="14" stroke-linecap="round"/><path d="M190 332L216 262L262 300L300 250L346 296L388 258L410 332Z" fill="#EDE6D8"/><rect x="214" y="236" width="70" height="104" rx="10" fill="#D8E0DB"/><rect x="226" y="262" width="46" height="34" rx="3" fill="#F7F4EC"/><rect x="312" y="214" width="62" height="126" rx="14" fill="${hi}"/><rect x="326" y="200" width="34" height="20" rx="5" fill="${deep}"/><path d="${d}" fill="${F}"/>${clip(d,w)}<rect x="140" y="322" width="320" height="22" rx="8" fill="${lo}"/>`;break}
  default:
    b=`<circle cx="300" cy="320" r="110" fill="${Rd}"/>`;
  }
  const scene=`<defs><filter id="${id}bl" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="7"/></filter><filter id="${id}bs" x="-30%" y="-150%" width="160%" height="400%"><feGaussianBlur stdDeviation="9"/></filter>
<linearGradient id="${id}l" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".6"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
<linearGradient id="${id}fl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${flr}"/><stop offset="1" stop-color="${flr2}"/></linearGradient>
<radialGradient id="${id}vg" cx=".5" cy=".5" r=".78"><stop offset=".62" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".2"/></radialGradient></defs>`;
  const leaves=`<g filter="url(#${id}bl)" fill="#0B3B3A" opacity=".14"><path d="M600 0H470C500 60 540 90 600 100Z"/><path d="M430 0C450 70 500 120 560 150C540 90 520 40 520 0Z"/><path d="M600 120C540 130 500 170 480 230C540 220 580 180 600 120Z"/><path d="M390 0C400 40 430 70 470 80C460 40 450 20 450 0Z"/></g>`;
  const beam=`<path d="M300 0H520L360 480H100Z" fill="url(#${id}l)" opacity=".5"/><path d="M-20 0H110L-20 340Z" fill="#fff" opacity=".2"/>`;
  const floor=`<rect x="0" y="476" width="600" height="124" fill="url(#${id}fl)"/><rect x="0" y="474" width="600" height="3" fill="#fff" opacity=".4"/>`;
  const contact=`<ellipse cx="300" cy="484" rx="180" ry="15" fill="#0B2F33" opacity=".38" filter="url(#${id}bs)"/>`;
  return `<svg viewBox="0 0 600 600" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">${defs}${scene}<rect width="600" height="600" fill="url(#${id}b)"/>${beam}${leaves}${floor}${contact}${b}<rect width="600" height="600" fill="url(#${id}vg)"/></svg>`;
}
function pic(p,ci){ci=ci||0;if(IMG[p.id])return `<img src="${esc(IMG[p.id])}" alt="${esc(p.name)}" loading="lazy">`;return art(p.kind,p.colors[ci].hex,p.v,catOf(p.cat).wall)}
function photo(key,fallback){return IMG[key]?`<img src="${esc(IMG[key])}" alt="" loading="lazy">`:fallback}

