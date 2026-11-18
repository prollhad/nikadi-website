/* part 0 */
try{
function nkPh(v){var s=String(v||'').trim(),d=s.replace(/\D/g,'');if(!d)return '';var i=/^(\+|00)/.test(s);if(i&&s.charAt(0)==='0')d=d.slice(2);if(i){if(d.indexOf('91')===0&&/^[6-9]\d{9}$/.test(d.slice(2)))return d.slice(2);return d.length>=8&&d.length<=15&&d.indexOf('91')!==0?d:'';}if(d.length===12&&d.indexOf('91')===0)d=d.slice(2);if(d.length===11&&d.charAt(0)==='0')d=d.slice(1);if(/^[6-9]\d{9}$/.test(d))return d;return d.length>=11&&d.length<=15&&d.charAt(0)!=='0'&&d.indexOf('91')!==0?d:'';}
}catch(e){console.error("[nikadi part 0]",e);}
/* part 1 */
try{

/* ---- Offer prices (from pricing.js) + member sign-in across the whole website ---- */
(function(){
  var API="https://ebwdrqdsexjterbxyeoa.supabase.co/functions/v1/api";
  var R=window.NikadiRates; if(!R) return;
  function inr(n){return '₹'+Number(n).toLocaleString('en-IN');}
  function store(k,v){try{if(v===undefined)return localStorage.getItem(k);if(v===null)localStorage.removeItem(k);else localStorage.setItem(k,v);}catch(e){return null;}}
  function $(id){return document.getElementById(id);}
  var today=R.today(), P=R.period(today), offer=P.offer;
  /* the next offer period, for the 24 Dec – 5 May normal-rate months */
  var nextOffer=null; R.PERIODS.forEach(function(x){if(!nextOffer&&x.offer&&x.from>today)nextOffer=x;});

  function memberDiscount(){var m=window.NK_MEMBER;return m&&m.discount?m.discount:0;}
  function paint(){
    var m=window.NK_MEMBER||null, pct=memberDiscount();
    /* offer bar + hero card */
    if(offer){$('offerBar').hidden=false;$('offerText').textContent=matchMedia('(max-width:620px)').matches?(offer.short||offer.line):offer.line;}
    var card=$('offerCard'); if(card){ card.hidden=false;
    $('ocTag').textContent=offer?offer.name:(m?m.tier+' member price':'Room rates');
    $('ocTitle').textContent=offer?(offer.until?'Till '+offer.until:'Our best price of the year'):(m?'Your price, '+m.firstName:'Deluxe rooms, per night');
    ['double','twin'].forEach(function(k){
      var std=R.STANDARD[k], now=P[k], mine=R.memberRate(now,pct);
      card.querySelectorAll('[data-std="'+k+'"]').forEach(function(el){el.textContent=(now<std||mine<std)?inr(std):'';});
      card.querySelectorAll('[data-now="'+k+'"]').forEach(function(el){el.textContent=inr(pct?mine:now);});
    });
    $('ocFoot').textContent=pct?'Your '+m.tier+' discount of '+pct+'% is already taken off'+(offer?' the offer price.':'.'):(offer?'Per room, per night. Come and enjoy your nights at Nikadi. Members pay even less.':'Per room, per night. Members save 5–20% on every night.'); }
    /* room cards and room pages */
    document.querySelectorAll('.price[data-kind]').forEach(function(el){
      var k=el.dataset.kind, std=R.STANDARD[k], now=P[k], mine=R.memberRate(now,pct);
      var h='<span class="from">Per night</span>';
      if(pct){h+='<s class="was">'+inr(std)+'</s><b>'+inr(mine)+'</b><span class="deal">'+m.tier+' price</span><span class="n">'+(offer?offer.name+' '+inr(now)+' less your '+pct+'%':'Standard '+inr(now)+' less your '+pct+'%')+'</span>';}
      else if(now<std){h+='<s class="was">'+inr(std)+'</s><b>'+inr(now)+'</b><span class="deal">'+offer.name+'</span><span class="n">'+(offer.until?'till '+offer.until:'for a limited time')+'</span>';}
      else{h+='<b>'+inr(now)+'</b>'+(nextOffer?'<span class="n">Members save 5–20%</span>':'');}
      el.innerHTML=h;
    });
    document.querySelectorAll('.mrate[data-kind]').forEach(function(el){
      var k=el.dataset.kind, now=P[k];
      if(pct){el.classList.add('mine');el.href='#booking';el.innerHTML='<span class="mrate-tag">'+m.tier+'</span><span>Signed in as '+m.firstName+' · you pay <b>'+inr(R.memberRate(now,pct))+'</b> a night</span>';}
      else{el.classList.remove('mine');el.href='app/?join=1';el.innerHTML='<span class="mrate-tag">Member rate</span><span>Members pay from <b>'+inr(R.memberRate(now,20))+'</b> to <b>'+inr(R.memberRate(now,5))+'</b> · <u data-signin>sign in</u> or join free</span>';}
    });
    /* header chip + hero line */
    var chip=$('memChip');
    if(m){chip.classList.add('on');$('memChipTxt').innerHTML=esc(m.firstName)+' <span class="tier">'+esc(m.tier)+'</span>';chip.setAttribute('aria-label','Signed in as '+m.firstName+', '+m.tier+' member');
      ($('heroMember')||{}).innerHTML='<span>Welcome back, '+esc(m.firstName)+'.</span> Your '+esc(m.tier)+' price is shown across the website.';}
    else{chip.classList.remove('on');$('memChipTxt').textContent='Member sign in';chip.removeAttribute('aria-label');
      ($('heroMember')||{}).innerHTML='<span>Members pay even less</span> · <a href="app/?join=1">Join free</a> or <button type="button" class="linkish" data-signin>sign in</button>';}
    if(window.nkBarUpdate)window.nkBarUpdate();
    document.querySelectorAll('.wform').forEach(function(f){f.dispatchEvent(new Event('change'));});
  }
  function esc(t){return String(t==null?'':t).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}

  /* member session: shared with the membership app (same website, same sign-in) */
  function setMember(mm){
    if(mm){window.NK_MEMBER={firstName:mm.firstName||String(mm.name||'').split(' ')[0],name:mm.name||mm.firstName,tier:mm.tier||'Silver',discount:Number(mm.discount)||0,points:mm.points||0};store('nk_site_member',JSON.stringify(window.NK_MEMBER));}
    else{window.NK_MEMBER=null;store('nk_site_member',null);}
    paint();
  }
  function api(action,data){
    return fetch(API,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(Object.assign({action:action},data||{}))})
      .then(function(r){return r.json();},function(){throw 'network';}).then(function(j){if(!j||!j.ok)throw (j&&j.error)||'server_error';return j;});
  }
  /* ?guest=1 shows the site as a new visitor sees it (for screenshots and videos); nothing stored is changed */
  var GUEST=/[?&]guest=1/.test(location.search);
  var token=GUEST?null:store('nk_token');
  try{var cached=GUEST?null:JSON.parse(store('nk_site_member')||'null');if(cached&&token)window.NK_MEMBER=cached;}catch(e){}
  paint();
  if(token){api('me',{token:token}).then(function(r){setMember(r.member);},function(c){if(c!=='network'){store('nk_token',null);setMember(null);}});}

  /* sign-in dialog */
  var dlg=$('signDlg'), last=null;
  var ERR={invalid_phone:'Please check your mobile number (other countries: start with + and the country code).',not_member:'This number is not a member yet. Join free to get member prices.',no_password:'Please set your password first in the membership app (tap “Forgot password or first time?”).',wrong_password:'Wrong password. Please try again.',too_many_attempts:'Too many wrong attempts. Please wait 15 minutes.',network:'No connection. Please check your internet.'};
  function open(){last=document.activeElement;var m=window.NK_MEMBER;$('sdIn').hidden=!!m;$('sdOut').hidden=!m;
    if(m){$('sdName').textContent=m.name;$('sdTier').textContent=m.tier+' member · '+m.discount+'% off every night'+(m.points?' · '+Number(m.points).toLocaleString('en-IN')+' points':'');
      $('sdSave').textContent='Tonight you pay '+inr(R.memberRate(P.double,m.discount))+' for a Deluxe Double and '+inr(R.memberRate(P.twin,m.discount))+' for a Deluxe Twin.';}
    dlg.hidden=false;document.documentElement.style.overflow='hidden';setTimeout(function(){var f=m?dlg.querySelector('.btn'):$('sdPhone');if(f)f.focus();},30);}
  function close(){dlg.hidden=true;document.documentElement.style.overflow='';if(last&&last.focus)last.focus();}
  $('memChip').addEventListener('click',open);
  document.addEventListener('click',function(e){var t=e.target.closest('[data-signin]');if(t){e.preventDefault();open();}});
  dlg.addEventListener('click',function(e){if(e.target===dlg||e.target.closest('[data-close]'))close();});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!dlg.hidden)close();});
  $('sdForm').addEventListener('submit',function(e){
    e.preventDefault();var b=$('sdGo'),ph=nkPh($('sdPhone').value),pw=$('sdPass').value;
    if(!ph){$('sdErr').textContent=ERR.invalid_phone;return;}
    if(!pw){$('sdErr').textContent='Please enter your password.';return;}
    $('sdErr').textContent='';b.disabled=true;b.textContent='Signing in…';
    api('login',{phone:ph,password:pw}).then(function(r){store('nk_token',r.token);setMember(r.member);$('sdPass').value='';b.disabled=false;b.textContent='Sign in';open();},
      function(c){b.disabled=false;b.textContent='Sign in';$('sdErr').textContent=ERR[c]||'Something went wrong. Please try again.';});
  });
  $('sdLogout').addEventListener('click',function(){var t=store('nk_token');store('nk_token',null);setMember(null);close();});
})();

}catch(e){console.error("[nikadi part 1]",e);}
/* part 2 */
try{

/* ---- Pay online (Razorpay). Shows only after the Razorpay keys are added in the Apps Script settings. ---- */
(function(){
  var API="https://ebwdrqdsexjterbxyeoa.supabase.co/functions/v1/api";
  var f=document.getElementById('payOnline'); if(!f) return;
  function $(id){return document.getElementById(id);}
  function api(a,d){return fetch(API,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(Object.assign({action:a},d||{}))}).then(function(r){return r.json();},function(){throw 'network';}).then(function(j){if(!j||!j.ok)throw (j&&j.error)||'server_error';return j;});}
  var cfg=null;
  api('payConfig').then(function(c){if(!c.enabled)return;cfg=c;f.hidden=false;prefill();},function(){});
  function prefill(){
    var m=window.NK_MEMBER; if(m&&!$('poName').value)$('poName').value=m.name||'';
    var ci=$('ci'),co=$('co'),rm=$('rm'),gu=$('gu');
    if(ci&&co&&co.value>ci.value&&window.NikadiRates){var k=Math.max(1,Math.ceil((+gu.value||1)/3));var q=NikadiRates.quote(rm.value,ci.value,co.value,k,m?m.discount:0);
      if(!$('poAmt').dataset.manual)$('poAmt').value=Math.ceil(q.total/2);
      $('poHint').textContent='50% advance for '+q.nights+(q.nights>1?' nights':' night')+' in '+k+' × '+rm.options[rm.selectedIndex].text+' (from the booking bar above) is ₹'+Math.ceil(q.total/2).toLocaleString('en-IN')+'. Please pay after we confirm your room on WhatsApp.';
      if(!$('poNote').dataset.manual){var fd=function(v){return new Date(v+'T12:00:00').toLocaleDateString('en-IN',{day:'numeric',month:'short'});};$('poNote').value=fd(ci.value)+' – '+fd(co.value)+' · '+rm.options[rm.selectedIndex].text;}}
  }
  ['ci','co','rm','gu'].forEach(function(id){var el=$(id);if(el)el.addEventListener('change',function(){if(cfg)prefill();});});
  $('poAmt').addEventListener('input',function(){this.dataset.manual='1';});
  $('poNote').addEventListener('input',function(){this.dataset.manual='1';});
  var ERR={pay_bad_amount:'Please enter an amount between ₹100 and ₹3,00,000.',name_required:'Please enter your name.',invalid_phone:'Please check the mobile number (other countries: start with + and the country code).',pay_failed:'The payment could not start. Please try again or pay by UPI below.',network:'No connection. Please check your internet.',pay_unverified:'We could not confirm the payment. If money was taken, send us the Razorpay receipt on WhatsApp.'};
  function loadRzp(){return new Promise(function(ok,no){if(window.Razorpay)return ok();var sc=document.createElement('script');sc.src='https://checkout.razorpay.com/v1/checkout.js';sc.onload=ok;sc.onerror=function(){no('network');};document.head.appendChild(sc);});}
  f.addEventListener('submit',function(e){
    e.preventDefault();var b=$('poGo');$('poErr').textContent='';
    var ph=nkPh($('poPhone').value);
    if(!$('poName').value.trim()){$('poErr').textContent=ERR.name_required;return;}
    if(!ph){$('poErr').textContent=ERR.invalid_phone;return;}
    b.disabled=true;b.textContent='Opening secure payment…';
    Promise.all([loadRzp(),api('payOrder',{name:$('poName').value,phone:ph,amount:$('poAmt').value,note:$('poNote').value,room:$('rm')?$('rm').value:'',checkin:$('ci')?$('ci').value:'',checkout:$('co')?$('co').value:''})]).then(function(x){
      var o=x[1];
      var rz=new Razorpay({key:o.keyId,order_id:o.order,amount:o.amount,currency:'INR',name:'Nikadi Guest House',description:'Booking advance',prefill:{name:o.name,contact:(String(o.phone).length===10?'+91':'+')+o.phone},theme:{color:'#d9ad55'},
        handler:function(r){b.textContent='Confirming…';api('payVerify',{order:r.razorpay_order_id,payment:r.razorpay_payment_id,signature:r.razorpay_signature}).then(function(v){
          f.querySelectorAll('.po-grid,#poGo,.po-hint').forEach(function(el){el.hidden=true;});$('poOk').hidden=false;
          $('poOk').textContent='Thank you! ₹'+Number(v.amount||$('poAmt').value).toLocaleString('en-IN')+' received (ref. '+v.ref+'). We will confirm your booking on WhatsApp shortly.';
        },function(c){b.disabled=false;b.textContent='Pay securely';$('poErr').textContent=ERR[c]||ERR.pay_unverified;});},
        modal:{ondismiss:function(){b.disabled=false;b.textContent='Pay securely';}}});
      rz.on('payment.failed',function(){$('poErr').textContent='The payment did not go through. No money was taken, or it will be returned by your bank. Please try again.';});
      rz.open();
    },function(c){b.disabled=false;b.textContent='Pay securely';$('poErr').textContent=ERR[c]||ERR.pay_failed;});
  });
})();

}catch(e){console.error("[nikadi part 2]",e);}
/* part 3 */
try{

// ---- Settings: update these to change payment details ----
var UPI_ID = "nikadiguesthouse@axisbank";
var UPI_NAME = "Khokon Ghosh";
var WA = "917501101137";
// -----------------------------------------------------------

(function(){
  var ci=document.getElementById('ci'),co=document.getElementById('co'),rm=document.getElementById('rm'),gu=document.getElementById('gu'),sum=document.getElementById('bookSum');
  if(!ci||!co)return;
  function iso(d){return d.toISOString().slice(0,10);}
  var t=new Date();t.setHours(12,0,0,0);
  var tm=new Date(t);tm.setDate(tm.getDate()+1);
  ci.min=iso(t);ci.value=iso(t);co.min=iso(tm);co.value=iso(tm);
  function roomsFor(g){return Math.max(1,Math.ceil((+g||1)/3));}
  function nights(){var a=new Date(ci.value),b=new Date(co.value);return Math.round((b-a)/864e5);}
  function fmt(n){return '₹'+n.toLocaleString('en-IN');}
  function pretty(v){var d=new Date(v+'T12:00:00');return d.toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'});}
  function update(){
    if(ci.value){var m=new Date(ci.value);m.setDate(m.getDate()+1);co.min=iso(m);if(!co.value||co.value<=ci.value)co.value=iso(m);}
    var n=nights(),k=roomsFor(gu.value),opt=rm.options[rm.selectedIndex],mem=window.NK_MEMBER||null;
    if(n<=0){sum.innerHTML='Choose a check-out date after check-in.';return;}
    var q=NikadiRates.quote(opt.value,ci.value,co.value,k,mem?mem.discount:0);
    var h=n+(n>1?' nights':' night')+' · '+k+' × '+opt.text+(k>1?' rooms':' room')+' · ';
    if(q.offer<q.standard)h+='<s>'+fmt(q.standard)+'</s> ';
    h+='<b>'+fmt(q.offer)+'</b>'+(q.offerName?' '+q.offerName.toLowerCase():'');
    if(mem&&mem.discount)h+=' · your '+mem.tier+' price <b>'+fmt(q.total)+'</b>';
    if(k>1)h+=' (max 3 guests per room)';
    sum.innerHTML=h+'.';
  }
  window.nkBarUpdate=update;
  [ci,co,rm,gu].forEach(function(el){el.addEventListener('change',update);});
  update();
  document.getElementById('bookForm').addEventListener('submit',function(e){
    e.preventDefault();
    var n=nights();if(n<1){update();return;}
    var txt='Hare Krishna! I would like to book at Nikadi Guest House.\n\nRoom: '+rm.value+'\nCheck-in: '+pretty(ci.value)+'\nCheck-out: '+pretty(co.value)+' ('+n+(n>1?' nights':' night')+')\nGuests: '+gu.value+'\nRooms: '+roomsFor(gu.value)+'\n\nIs it available?';
    var a=document.createElement('a');a.href='https://wa.me/'+WA+'?text='+encodeURIComponent(txt);a.target='_blank';a.rel='noopener';document.body.appendChild(a);a.click();a.remove();
  });
  document.querySelectorAll('[data-room]').forEach(function(b){b.addEventListener('click',function(){rm.selectedIndex=+b.dataset.room;update();});});

  function copy(text,msgEl,srcEl){
    function ok(){msgEl.textContent='Copied';setTimeout(function(){msgEl.textContent='';},2000);}
    function fb(){var r=document.createRange();r.selectNodeContents(srcEl);var s=getSelection();s.removeAllRanges();s.addRange(r);msgEl.textContent='Selected. Use your device\'s copy option.';}
    try{navigator.clipboard.writeText(text).then(ok,fb);}catch(e){fb();}
  }
  document.getElementById('copyBank').addEventListener('click',function(){copy('Account name: Khokon Ghosh\nAccount no: 925010055272125\nIFSC: UTIB0006265\nBank: Axis Bank',document.getElementById('bankMsg'),document.querySelector('.bank dl'));});
  document.getElementById('copyEmail').addEventListener('click',function(){copy('nikadiguesthouse@gmail.com',document.getElementById('emailMsg'),document.getElementById('email'));});

  if(UPI_ID){
    var uri='upi://pay?pa='+encodeURIComponent(UPI_ID)+'&pn='+encodeURIComponent(UPI_NAME)+'&cu=INR&tn='+encodeURIComponent('Nikadi booking advance');
    var box=document.getElementById('qr');box.innerHTML='';
    try{new QRCode(box,{text:uri,width:400,height:400,correctLevel:QRCode.CorrectLevel.M});}catch(e){box.innerHTML='<p class="wait">Pay to the UPI ID below.</p>';}
    document.getElementById('upiId').textContent=UPI_ID;
    document.getElementById('upiActs').hidden=false;
    document.getElementById('upiLink').href=uri;
    document.getElementById('copyUpi').addEventListener('click',function(){copy(UPI_ID,document.getElementById('upiMsg'),document.getElementById('upiId'));});
  }
})();

}catch(e){console.error("[nikadi part 3]",e);}
/* part 4 */
try{

/* ---- Online forms (Advance Booking + Guest Registration) ---- */
(function(){
  var WA_NO = "917501101137";
  var BOOKING_API = "https://ebwdrqdsexjterbxyeoa.supabase.co/functions/v1/api"; // Google Apps Script /exec URL. When set, Advance Booking Forms also arrive in the staff app as Pending.
  var sheets = [].slice.call(document.querySelectorAll('.sheet'));
  function iso(d){return d.toISOString().slice(0,10);}
  function pretty(v){var d=new Date(v+'T12:00:00');return isNaN(d)?v:d.toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'});}
  function prettyTime(v){var p=v.split(':'),h=+p[0],m=p[1];return ((h%12)||12)+':'+m+(h<12?' AM':' PM');}
  function inr(n){return n.toLocaleString('en-IN');}

  // live calculations inside each form
  function calc(f){
    var ci=f.querySelector('[data-role=ci]'),co=f.querySelector('[data-role=co]'),n=f.querySelector('[data-role=n]'),
        room=f.querySelector('[data-role=room]'),rate=f.querySelector('[data-role=rate]'),total=f.querySelector('[data-role=total]'),
        rooms=f.querySelector('[data-role=rooms]');
    if(!ci)return;
    if(ci.value){var m=new Date(ci.value+'T12:00:00');m.setDate(m.getDate()+1);co.min=iso(m);}
    var nights=(ci.value&&co.value)?Math.round((new Date(co.value)-new Date(ci.value))/864e5):0;
    n.value=nights>0?nights:'';
    var rtype=room.value,mem=window.NK_MEMBER||null,pct=mem?mem.discount:0;
    var qq=(nights>0)?NikadiRates.quote(rtype,ci.value,co.value,1,pct):null;
    var r=qq?Math.round(qq.total/qq.nights):NikadiRates.memberRate(NikadiRates.rate(rtype,ci.value||NikadiRates.today()),pct);
    rate.value=qq&&qq.mixed?qq.perNight.map(function(x){return inr(x.member);}).filter(function(v,i,a){return a.indexOf(v)===i;}).join(' / '):inr(r);
    var ad=f.querySelector('[data-role=adults]'),ch=f.querySelector('[data-role=children]');
    if(rooms){
      var people=(+ad.value||0)+(+(ch&&ch.value)||0),need=Math.max(1,Math.ceil(people/3));
      rooms.min=need;
      if(!rooms.dataset.manual||(+rooms.value||0)<need)rooms.value=need;
    }
    if(total){var q=rooms?Math.max(1,+rooms.value||1):1,tt=qq?qq.total*q:0;total.value=nights>0?inr(tt):'';
      var a50=f.querySelector('[data-role=adv50]');if(a50)a50.value=nights>0?inr(Math.ceil(tt/2)):'';}
  }
  document.querySelectorAll('.wform').forEach(function(f){
    var t=new Date();t.setHours(12,0,0,0);
    f.querySelectorAll('[data-role=ci]').forEach(function(el){el.min=iso(t);});
    var rf=f.querySelector('[data-role=rooms]');
    if(rf)rf.addEventListener('input',function(){rf.dataset.manual='1';});
    f.addEventListener('input',function(){calc(f);});
    f.addEventListener('change',function(){calc(f);});
    calc(f);
  });

  // copy dates / room / guests from the booking bar when a form opens empty
  function prefill(id){
    var f=document.querySelector('#'+id+' form');if(!f)return;
    var ci=f.querySelector('[data-role=ci]'),co=f.querySelector('[data-role=co]'),room=f.querySelector('[data-role=room]'),ad=f.querySelector('[data-role=adults]');
    if(!ci)return;
    var bci=document.getElementById('ci'),bco=document.getElementById('co'),brm=document.getElementById('rm'),bgu=document.getElementById('gu');
    if(!ci.value&&bci&&bci.value){ci.value=bci.value;co.value=bco.value;room.selectedIndex=brm.selectedIndex;ad.value=bgu.value;}
    calc(f);
  }

  // open / close sheets from the address hash
  function route(){
    var h=location.hash.slice(1),open=false;
    sheets.forEach(function(s){var on=s.id===h;s.hidden=!on;if(on){open=true;}});
    document.documentElement.style.overflow=open?'hidden':'';
    if(open){prefill(h);document.getElementById(h).scrollTop=0;}
  }
  window.addEventListener('hashchange',route);
  route();

  // foreign nationals section
  var nat=document.getElementById('r_nat'),fs=document.getElementById('foreignSet');
  function natToggle(){var v=nat.value.trim().toLowerCase();var show=v!==''&&v!=='indian'&&v!=='india';fs.hidden=!show;fs.disabled=!show;}
  nat.addEventListener('input',natToggle);natToggle();

  // accompanying guests
  var plist=document.getElementById('plist'),pc=0;
  function addPerson(){
    if(plist.children.length>=8)return;
    pc++;var d=document.createElement('div');d.className='person';
    d.innerHTML='<label class="fld"><span>Name</span><input id="p'+pc+'_n"></label>'+
      '<label class="fld"><span>Age</span><input id="p'+pc+'_a" type="number" min="0" max="120"></label>'+
      '<label class="fld"><span>Relation</span><input id="p'+pc+'_r"></label>'+
      '<label class="fld"><span>ID type &amp; number</span><input id="p'+pc+'_i"></label>'+
      '<button type="button" class="rm" aria-label="Remove this guest">&times;</button>';
    d.querySelector('.rm').addEventListener('click',function(){d.remove();});
    plist.appendChild(d);
  }
  document.getElementById('addPerson').addEventListener('click',addPerson);
  addPerson();

  // turn a form into a WhatsApp message
  function build(f){
    var out=[],now=new Date();
    out.push('*NIKADI GUEST HOUSE*\n*'+f.dataset.title+'*\nSubmitted online: '+now.toLocaleString('en-IN',{day:'numeric',month:'short',year:'numeric',hour:'numeric',minute:'2-digit'}));
    f.querySelectorAll('fieldset').forEach(function(s){
      if(s.hidden)return;
      var lines=[];
      if(s.classList.contains('people')){
        s.querySelectorAll('.person').forEach(function(p){
          var v=[].map.call(p.querySelectorAll('input'),function(e){return e.value.trim();});
          if(v.join(''))lines.push((lines.length+1)+'. '+(v[0]||'-')+' | Age: '+(v[1]||'-')+' | '+(v[2]||'-')+' | ID: '+(v[3]||'-'));
        });
      } else {
        s.querySelectorAll('[data-l]').forEach(function(el){
          var v='';
          if(el.classList.contains('checks')){v=[].map.call(el.querySelectorAll('input:checked'),function(c){return c.value;}).join(', ');}
          else if(el.type==='checkbox'){v=el.checked?'Yes':'';}
          else{v=el.value.trim();if(v&&el.type==='date')v=pretty(v);if(v&&el.type==='time')v=prettyTime(v);if(v&&el.id==='r_gst')v=v.toUpperCase();if(v&&el.dataset.role==='rate')v='₹'+v;if(v&&el.dataset.role==='total')v='₹'+v;if(v&&el.dataset.role==='adv50')v='₹'+v;}
          if(v)lines.push(el.dataset.l+': '+v);
        });
      }
      if(lines.length)out.push('*'+s.querySelector('legend').textContent.toUpperCase()+'*\n'+lines.join('\n'));
    });
    out.push({fReg:'I will send a photo of my ID proof in this chat.',fAdv:'I will send the payment screenshot in this chat.',fMem:'Please add me as a Nikadi member.'}[f.id]||'');
    return out.join('\n\n');
  }

  document.querySelectorAll('.wform').forEach(function(f){
    var wrap=f.parentNode,done=wrap.querySelector('.done'),ta=done.querySelector('textarea'),again=done.querySelector('.wa-again'),msg=done.querySelector('.msg');
    f.addEventListener('submit',function(e){
      e.preventDefault();
      if(!f.checkValidity()){f.reportValidity();return;}
      var text=build(f),url='https://wa.me/'+WA_NO+'?text='+encodeURIComponent(text);
      ta.value=text;again.href=url;
      if(BOOKING_API&&f.querySelector('#a_ci')){
        var g=function(id){var el=f.querySelector('#'+id);return el?el.value.trim():'';};
        var extras=[].slice.call(f.querySelectorAll('#a_x1:checked,#a_x2:checked')).map(function(x){return x.value;}).join(', ');
        var body={action:'deskBookingRequest',guest:g('a_name'),phone:g('a_mob'),email:g('a_email'),guests:(+g('a_ad')||0)+(+g('a_ch')||0),roomsNeeded:+g('a_rooms')||1,
          roomType:g('a_room'),checkin:g('a_ci'),checkout:g('a_co'),waOk:!!(document.getElementById('a_wa')||{}).checked,notes:[g('a_city'),g('a_cit')?'Arrival '+g('a_cit'):'',extras,g('a_req')].filter(Boolean).join(' · ')};
        try{fetch(BOOKING_API,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(body)}).catch(function(){});}catch(err){}
      }
      if(BOOKING_API&&f.id==='fReg'){ // the registration card also goes straight to the staff app
        var fields=[],people=[];
        f.querySelectorAll('fieldset').forEach(function(s){
          if(s.hidden)return;
          if(s.classList.contains('people')){s.querySelectorAll('.person').forEach(function(pp){var v=[].map.call(pp.querySelectorAll('input'),function(e){return e.value.trim();});if(v.join(''))people.push((v[0]||'-')+' | Age: '+(v[1]||'-')+' | '+(v[2]||'-')+' | ID: '+(v[3]||'-'));});return;}
          s.querySelectorAll('[data-l]').forEach(function(el){var v='';if(el.classList.contains('checks'))v=[].map.call(el.querySelectorAll('input:checked'),function(c){return c.value;}).join(', ');else if(el.type==='checkbox')v=el.checked?'Yes':'';else v=el.value.trim();if(v)fields.push([el.dataset.l,v]);});
        });
        var gv=function(sel){var el=f.querySelector(sel);return el?el.value.trim():'';};
        var rb={action:'deskGuestRegister',name:gv('#r_name'),phone:gv('#r_mob'),email:gv('#r_email'),checkin:gv('#r_ci'),checkout:gv('[data-l="Check-out date"]'),fields:fields,people:people};
        try{fetch(BOOKING_API,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(rb)}).catch(function(){});}catch(err){}
      }
      f.hidden=true;done.hidden=false;
      var sheet=f.closest('.sheet');if(sheet)sheet.scrollTop=0;
      var a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener';document.body.appendChild(a);a.click();a.remove();
    });
    done.querySelector('.edit-form').addEventListener('click',function(){done.hidden=true;f.hidden=false;});
    done.querySelector('.copy-form').addEventListener('click',function(){
      function ok(){msg.textContent='Copied. Paste it in WhatsApp.';setTimeout(function(){msg.textContent='';},3000);}
      function fb(){ta.focus();ta.select();msg.textContent='Text selected. Use your device\'s copy option.';}
      try{navigator.clipboard.writeText(ta.value).then(ok,fb);}catch(err){fb();}
    });
  });
})();

}catch(e){console.error("[nikadi part 4]",e);}
/* part 5 */
try{

/* ---- Photo lightbox ---- */
(function(){
  var figs=[].slice.call(document.querySelectorAll('figure.zoom'));
  if(!figs.length)return;
  var lb=document.createElement('div');lb.className='lb';lb.hidden=true;lb.setAttribute('role','dialog');lb.setAttribute('aria-modal','true');lb.setAttribute('aria-label','Photo viewer');
  lb.innerHTML='<div class="lb-top"><span id="lbCount"></span><button type="button" class="close" aria-label="Close">&times;</button></div>'+
    '<div class="lb-stage"><button type="button" class="prev" aria-label="Previous photo">&#8249;</button><img id="lbImg" alt=""><button type="button" class="next" aria-label="Next photo">&#8250;</button></div>'+
    '<p class="lb-cap" id="lbCap"></p>';
  document.body.appendChild(lb);
  var img=lb.querySelector('#lbImg'),cap=lb.querySelector('#lbCap'),cnt=lb.querySelector('#lbCount'),i=0,last=null,sx=null;
  // unique photos only, in page order
  var list=[];figs.forEach(function(f){var s=f.querySelector('img').getAttribute('src');if(!list.some(function(x){return x.src===s;}))list.push({src:s,alt:f.querySelector('img').alt,cap:(f.querySelector('figcaption')||{}).textContent||''});});
  function show(n){i=(n+list.length)%list.length;img.src=list[i].src;img.alt=list[i].alt;cap.textContent=list[i].cap;cnt.textContent=(i+1)+' / '+list.length;}
  function open(src){last=document.activeElement;var n=0;list.forEach(function(x,k){if(x.src===src)n=k;});show(n);lb.hidden=false;document.documentElement.style.overflow='hidden';lb.querySelector('.close').focus();}
  function close(){lb.hidden=true;document.documentElement.style.overflow='';if(last)last.focus();}
  figs.forEach(function(f){f.tabIndex=0;f.setAttribute('role','button');f.setAttribute('aria-label','View photo: '+f.querySelector('img').alt);
    f.addEventListener('click',function(){open(f.querySelector('img').getAttribute('src'));});
    f.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();open(f.querySelector('img').getAttribute('src'));}});});
  lb.querySelector('.close').onclick=close;lb.querySelector('.prev').onclick=function(){show(i-1);};lb.querySelector('.next').onclick=function(){show(i+1);};
  lb.addEventListener('click',function(e){if(e.target===lb||e.target.classList.contains('lb-stage'))close();});
  document.addEventListener('keydown',function(e){if(lb.hidden)return;if(e.key==='Escape')close();if(e.key==='ArrowLeft')show(i-1);if(e.key==='ArrowRight')show(i+1);});
  lb.addEventListener('touchstart',function(e){sx=e.touches[0].clientX;},{passive:true});
  lb.addEventListener('touchend',function(e){if(sx==null)return;var dx=e.changedTouches[0].clientX-sx;if(Math.abs(dx)>50)show(i+(dx<0?1:-1));sx=null;});
})();

}catch(e){console.error("[nikadi part 5]",e);}
/* part 6 */
try{

/* ---- Hero: moving photo slideshow, new photo every 5 seconds ---- */
(function(){
  var box=document.getElementById('heroSlides'); if(!box) return;
  var S=[
    ['double-04','Deluxe Double','Wide windows and soft morning light','62% 74%'],
    ['double-01','Deluxe Double','King bed and warm cove lighting','50% 72%'],
    ['large-twin','Large Twin · 3rd floor','Room for three, with the roof terrace outside','40% 60%'],
    ['double-05','Deluxe Double','Deep sleep, soft linen','50% 70%'],
    ['facade-night','Nikadi Guest House','Opposite ISKCON Gate No. 4, lit up at night','50% 45%'],
    ['facade-day','Nikadi Guest House','On Bhaktisiddhanta Saraswati Marg'],
    ['reception','Reception','First floor, open 16 hours a day']
  ];
  var ALT={'large-twin':'Large Twin room with two single beds and marble floor','facade-night':'Nikadi Guest House lit up at night','double-01':'Deluxe Double room with king bed','double-05':'Deluxe Double room with king bed and wardrobe','facade-night':'Nikadi Guest House lit up at night','double-02':'Deluxe Double room with sofa and wardrobe','twin-03':'Deluxe Twin room with two single beds','facade-day':'Nikadi Guest House building by day','reception':'Nikadi reception desk','double-04':'Deluxe Double room by the window'};
  var imgs=[box.querySelector('img')], i=0, timer=null, loaded={0:true};
  for(var k=1;k<S.length;k++){var im=document.createElement('img');im.alt=ALT[S[k][0]]||'';im.decoding='async';im.width=1100;im.height=1375;box.appendChild(im);imgs.push(im);}
  function load(k){if(loaded[k])return;loaded[k]=true;imgs[k].src='img/hero/'+(matchMedia('(min-width:1001px)').matches?'W/':'P/')+S[k][0]+'.webp';if(S[k][3])imgs[k].style.objectPosition=S[k][3];}
  function pad(n){return (n<10?'0':'')+n;}
  document.getElementById('capOf').textContent=pad(S.length);
  function show(k){
    k=(k+S.length)%S.length; load(k); load((k+1)%S.length);
    var go=function(){imgs[i].classList.remove('on');void imgs[k].offsetWidth;imgs[k].classList.add('on');i=k;
      document.getElementById('capKick').textContent=S[k][1];document.getElementById('capText').textContent=S[k][2];document.getElementById('capNo').textContent=pad(k+1);
      var bar=document.getElementById('heroProg');bar.style.animation='none';void bar.offsetWidth;bar.style.animation='';};
    if(imgs[k].complete&&imgs[k].naturalWidth)go();else{imgs[k].onload=imgs[k].onerror=function(){imgs[k].onload=null;go();};}
  }
  function start(){stop();timer=setInterval(function(){show(i+1);},6000);}
  function stop(){clearInterval(timer);timer=null;}
  document.getElementById('heroNext').onclick=function(){show(i+1);start();};
  document.getElementById('heroPrev').onclick=function(){show(i-1);start();};
  var tx=null;box.addEventListener('touchstart',function(e){tx=e.touches[0].clientX;},{passive:true});
  box.addEventListener('touchend',function(e){if(tx==null)return;var dx=e.changedTouches[0].clientX-tx;if(Math.abs(dx)>40){show(i+(dx<0?1:-1));start();}tx=null;});
  document.addEventListener('visibilitychange',function(){document.hidden?stop():start();});
  load(1); start();
})();

}catch(e){console.error("[nikadi part 6]",e);}
/* part 7 */
try{

/* ---- Membership pop-up: once, after the visitor starts scrolling ---- */
(function(){
  var pop=document.getElementById('joinpop');if(!pop)return;
  var KEY='nk_joinpop_until';
  function get(k){try{return localStorage.getItem(k);}catch(e){return null;}}
  function set(k,v){try{localStorage.setItem(k,v);}catch(e){}}
  if(get('nk_token'))return;                       // already logged in to the member app
  var until=+get(KEY)||0;if(until>Date.now())return;
  var shown=false,lastFocus=null;
  function open(){
    if(shown||document.querySelector('.sheet:not([hidden])'))return;
    shown=true;lastFocus=document.activeElement;pop.hidden=false;document.getElementById('jpClose').focus();
    window.removeEventListener('scroll',onScroll);
  }
  function close(days){pop.hidden=true;set(KEY,String(Date.now()+(days||3)*864e5));if(lastFocus&&lastFocus.focus)lastFocus.focus();}
  function onScroll(){if(window.scrollY>Math.min(700,window.innerHeight*0.8))setTimeout(open,400);}
  window.addEventListener('scroll',onScroll,{passive:true});
  document.getElementById('jpClose').onclick=function(){close(3);};
  document.getElementById('jpLater').onclick=function(){close(3);};
  document.getElementById('jpJoin').addEventListener('click',function(){set(KEY,String(Date.now()+30*864e5));});
  pop.addEventListener('click',function(e){if(e.target===pop)close(3);});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!pop.hidden)close(3);});
})();

}catch(e){console.error("[nikadi part 7]",e);}
/* part 8 */
try{

/* ---- Room details gallery ---- */
(function(){
  document.querySelectorAll('[data-gallery]').forEach(function(g){
    var img=g.querySelector('.rd-img'),cap=g.querySelector('.rd-cap'),cnt=g.querySelector('.rd-count'),
        th=[].slice.call(g.querySelectorAll('.rd-thumbs button')),i=0,sx=null;
    function show(n){
      i=(n+th.length)%th.length;var b=th[i];
      img.classList.add('fade');
      var pre=new Image();pre.onload=pre.onerror=function(){img.src=b.dataset.src;img.alt=b.querySelector('img').alt;img.classList.remove('fade');};pre.src=b.dataset.src;
      cap.textContent=b.dataset.cap;cnt.textContent=(i+1)+' / '+th.length;
      th.forEach(function(t,k){t.setAttribute('aria-current',k===i?'true':'false');});
      b.scrollIntoView({block:'nearest',inline:'center',behavior:'smooth'});
      if(th[i+1]){var p=new Image();p.src=th[i+1].dataset.src;}
    }
    th.forEach(function(b,k){b.addEventListener('click',function(){show(k);});});
    g.querySelector('.prev').addEventListener('click',function(){show(i-1);});
    g.querySelector('.next').addEventListener('click',function(){show(i+1);});
    var main=g.querySelector('.rd-main');
    main.addEventListener('touchstart',function(e){sx=e.touches[0].clientX;},{passive:true});
    main.addEventListener('touchend',function(e){if(sx==null)return;var dx=e.changedTouches[0].clientX-sx;if(Math.abs(dx)>45)show(i+(dx<0?1:-1));sx=null;});
    document.addEventListener('keydown',function(e){var sh=g.closest('.sheet');if(!sh||sh.hidden)return;if(e.key==='ArrowLeft')show(i-1);if(e.key==='ArrowRight')show(i+1);if(e.key==='Escape')location.hash='rooms';});
    th[0].setAttribute('aria-current','true');
  });
})();

}catch(e){console.error("[nikadi part 8]",e);}
/* part 9 */
try{

/* ---- v3: reviews carousel, live gadgets, phone dock + menu, quick message, share, scroll reveal ---- */
(function(){
  function $(id){return document.getElementById(id);}
  function pad(n){return (n<10?'0':'')+n;}
  var LAT=23.42668, LNG=88.3880999;
  function ist(){return new Date(Date.now()+330*60000);} /* read with getUTC* */
  function t12(h,m){var ap=h<12?'AM':'PM';h=h%12||12;return h+':'+pad(m)+' '+ap;}
  function dur(min){var h=Math.floor(min/60),m=min%60;return (h?h+' h ':'')+m+' min';}

  /* scroll reveal */
  var rv=document.querySelectorAll('.rv');
  if('IntersectionObserver' in window){
    var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}});},{rootMargin:'0px 0px -8% 0px'});
    rv.forEach(function(el){io.observe(el);});
  } else rv.forEach(function(el){el.classList.add('in');});

  /* reviews: arrows + read more */
  var tr=$('revTrack');
  if(tr){
    document.querySelectorAll('[data-rev]').forEach(function(b){b.addEventListener('click',function(){var c=tr.querySelector('.rev');tr.scrollBy({left:(c?c.offsetWidth+18:320)*(+b.getAttribute('data-rev')),behavior:'smooth'});});});
    function checkMore(){tr.querySelectorAll('.rev').forEach(function(r){var p=r.querySelector('p'),b=r.querySelector('.rev-more');if(!r.classList.contains('open'))b.hidden=p.scrollHeight<=p.clientHeight+2;});}
    tr.addEventListener('click',function(e){var b=e.target.closest('.rev-more');if(!b)return;var r=b.closest('.rev');r.classList.toggle('open');b.textContent=r.classList.contains('open')?'Show less':'Read more';});
    window.addEventListener('load',checkMore);window.addEventListener('resize',checkMore);setTimeout(checkMore,300);
  }

  /* clock + desk status */
  function tick(){
    var d=ist(),h=d.getUTCHours(),m=d.getUTCMinutes(),now=h*60+m;
    if($('gClock'))$('gClock').innerHTML=(h%12||12)+':'+pad(m)+'<small>'+(h<12?'AM':'PM')+'</small>';
    var days=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],mon=['January','February','March','April','May','June','July','August','September','October','November','December'];
    if($('gDate'))$('gDate').textContent=days[d.getUTCDay()]+', '+d.getUTCDate()+' '+mon[d.getUTCMonth()]+' · India time';
    var p=$('gDesk');if(p){
      if(now<9*60){p.textContent='Check-out by 9:00 AM · in '+dur(9*60-now);p.className='pill';}
      else if(now<11*60){p.textContent='Check-in opens at 11:00 AM · in '+dur(11*60-now);p.className='pill';}
      else if(now<22*60){p.textContent='Check-in is open now · from 11:00 AM';p.className='pill ok';}
      else{p.textContent='Arriving late tonight? WhatsApp us before you come';p.className='pill';}
    }
    sunDot();
  }
  tick();setInterval(tick,20000);

  /* weather + sun (Open-Meteo, no key) */
  var WX={0:'Clear',1:'Mostly clear',2:'Partly cloudy',3:'Cloudy',45:'Fog',48:'Fog',51:'Drizzle',53:'Drizzle',55:'Drizzle',56:'Drizzle',57:'Drizzle',61:'Light rain',63:'Rain',65:'Heavy rain',66:'Rain',67:'Rain',71:'Snow',73:'Snow',75:'Snow',80:'Showers',81:'Showers',82:'Heavy showers',95:'Thunderstorm',96:'Thunderstorm',99:'Thunderstorm'};
  var SUN=null;
  function hm(iso){var t=String(iso).slice(11,16).split(':');return [+t[0],+t[1]];}
  function sunDot(){
    var dot=$('gSunDot');if(!dot||!SUN)return;
    var d=ist(),now=d.getUTCHours()*60+d.getUTCMinutes(),f=(now-SUN[0])/(SUN[1]-SUN[0]);
    var sub=$('gSunSub');
    if(f<0||f>1){dot.setAttribute('cx',f<0?4:196);dot.setAttribute('cy',44);dot.setAttribute('opacity','.35');
      if(sub)sub.textContent=f<0?'Sunrise in '+dur(SUN[0]-now)+'. Mangala arati is before sunrise.':'The sun has set. Evening arati and kirtan time in the Dham.';return;}
    var t=f,x=(1-t)*(1-t)*4+2*(1-t)*t*100+t*t*196,y=(1-t)*(1-t)*44+2*(1-t)*t*(-30)+t*t*44;
    dot.setAttribute('cx',x.toFixed(1));dot.setAttribute('cy',y.toFixed(1));dot.setAttribute('opacity','1');
    if(sub)sub.textContent='Sunset in '+dur(SUN[1]-now)+'. Lovely time for a walk by the Ganga.';
  }
  /* weather icons (inline, gold) */
  function wxIcon(c,day){
    var sun='<circle cx="12" cy="12" r="4.2" fill="currentColor"/><g stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/></g>';
    var moon='<path d="M15.5 3.5a8 8 0 1 0 5 13.6A7 7 0 0 1 15.5 3.5z" fill="currentColor"/>';
    var cloud='<path d="M7 18.5h10a4 4 0 0 0 .6-8 5.5 5.5 0 0 0-10.6 1.4A3.4 3.4 0 0 0 7 18.5z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>';
    var small='<g transform="translate(-4 -4) scale(.75)">'+(day?sun:moon)+'</g>';
    var rain='<g stroke="#9fd0ff" stroke-width="1.7" stroke-linecap="round"><path d="M9 20.5l-1 2M13 20.5l-1 2M17 20.5l-1 2"/></g>';
    var bolt='<path d="M13 19l-2.5 4 .5-3h-2l2.5-4-.5 3z" fill="#f4d797"/>';
    var fog='<g stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M4 9h16M3 13h18M5 17h14"/></g>';
    var g;
    if(c===0)g=day?sun:moon;
    else if(c<=2)g=small+cloud;
    else if(c===3)g=cloud;
    else if(c===45||c===48)g=fog;
    else if(c>=95)g=cloud+bolt;
    else if(c>=51)g=cloud+rain;
    else g=cloud;
    return '<svg viewBox="0 0 24 24" aria-hidden="true">'+g+'</svg>';
  }
  var WXD=null;
  function wxSheet(){
    var w=WXD;if(!w||!$('wxT'))return;
    var c=w.current,dl=w.daily,hr=w.hourly;
    $('wxIco').outerHTML=wxIcon(c.weather_code,c.is_day).replace('<svg','<svg class="ico" id="wxIco"');
    $('wxT').textContent=Math.round(c.temperature_2m)+'°C';
    $('wxC').textContent=WX[c.weather_code]||'';
    $('wxM').textContent='Today '+Math.round(dl.temperature_2m_min[0])+'° to '+Math.round(dl.temperature_2m_max[0])+'° · '+(dl.precipitation_probability_max[0]||0)+'% chance of rain';
    $('wxFeel').textContent=Math.round(c.apparent_temperature)+'°';
    var fd=c.apparent_temperature-c.temperature_2m;$('wxFeelS').textContent=fd>1.5?'Warmer than it reads':fd<-1.5?'Cooler than it reads':'About the same';
    $('wxHum').textContent=c.relative_humidity_2m+'%';
    $('wxWind').textContent=Math.round(c.wind_speed_10m)+' km/h';$('wxWindS').textContent=c.wind_speed_10m<12?'Calm and gentle':c.wind_speed_10m<25?'A light breeze':'Windy by the river';
    $('wxRain').textContent=(dl.precipitation_probability_max[0]||0)+'%';$('wxRainS').textContent=(dl.precipitation_sum[0]||0)>0.2?'About '+dl.precipitation_sum[0].toFixed(1)+' mm':'No real rain expected';
    var a=hm(dl.sunrise[0]),b=hm(dl.sunset[0]);$('wxRise').textContent=t12(a[0],a[1]);$('wxSet').textContent=t12(b[0],b[1]);
    var uv=dl.uv_index_max[0];$('wxUv').textContent=uv!=null?Math.round(uv):'--';$('wxUvS').textContent=uv==null?'':uv<3?'Low':uv<6?'Moderate, a cap helps':uv<8?'High, carry an umbrella':'Very high, stay in shade at noon';
    $('wxRng').textContent=Math.round(dl.temperature_2m_min[0])+'° / '+Math.round(dl.temperature_2m_max[0])+'°';
    /* simple advice for the day */
    var tip=[];
    if((dl.precipitation_probability_max[0]||0)>=50)tip.push('Rain is likely today. Carry an umbrella for the walk to the temple.');
    if(dl.temperature_2m_min[0]<16)tip.push('Early mornings are cool. Bring a shawl for Mangal Arati at 4:30 AM.');
    if(dl.temperature_2m_max[0]>=34)tip.push('Hot afternoon. Plan darshan and parikrama for the morning and evening, and drink plenty of water.');
    if(uv>=8)tip.push('Strong sun around midday. Use the 1–4 PM temple break to rest in your room.');
    $('wxTip').hidden=!tip.length;$('wxTip').textContent=tip.join(' ');
    /* next 24 hours */
    var now=ist(),key=now.getUTCFullYear()+'-'+pad(now.getUTCMonth()+1)+'-'+pad(now.getUTCDate())+'T'+pad(now.getUTCHours())+':00';
    var i0=hr.time.indexOf(key);if(i0<0)i0=0;
    var hh='',pts=[],lo=99,hi=-99;
    for(var i=i0;i<Math.min(i0+24,hr.time.length);i++){
      var H=+hr.time[i].slice(11,13),tt=hr.temperature_2m[i],rp=hr.precipitation_probability[i];
      lo=Math.min(lo,tt);hi=Math.max(hi,tt);pts.push(tt);
      var day=H>=6&&H<18;
      hh+='<div'+(i===i0?' class="now"':'')+'><span>'+(i===i0?'Now':((H%12||12)+(H<12?' AM':' PM')))+'</span>'+wxIcon(hr.weather_code[i],day)+'<b>'+Math.round(tt)+'°</b><span class="rp">'+(rp?rp+'%':'&nbsp;')+'</span></div>';
    }
    $('wxHours').innerHTML=hh;
    var n=pts.length,sv='',span=Math.max(hi-lo,1),pth='';
    pts.forEach(function(v,k){var x=(k/(n-1||1))*580+10,y=100-((v-lo)/span)*72;pth+=(k?'L':'M')+x.toFixed(1)+' '+y.toFixed(1);});
    sv='<defs><linearGradient id="wxg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d9ad55" stop-opacity=".35"/><stop offset="1" stop-color="#d9ad55" stop-opacity="0"/></linearGradient></defs>';
    sv+='<path d="'+pth+' L590 118 L10 118 Z" fill="url(#wxg)"/><path d="'+pth+'" fill="none" stroke="#f4d797" stroke-width="2.2" vector-effect="non-scaling-stroke"/>';
    $('wxChart').innerHTML=sv;
    if($('wxChartL'))$('wxChartL').textContent='Temperature next 24 hours · high '+Math.round(hi)+'°, low '+Math.round(lo)+'°';
    /* 7 days */
    var dn=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],mn=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var L=Math.min.apply(null,dl.temperature_2m_min),U=Math.max.apply(null,dl.temperature_2m_max),R=Math.max(U-L,1),dh='';
    for(var d=0;d<dl.time.length;d++){
      var dd=new Date(dl.time[d]+'T00:00:00Z'),mi=dl.temperature_2m_min[d],ma=dl.temperature_2m_max[d];
      var sr=hm(dl.sunrise[d]),ss=hm(dl.sunset[d]);
      dh+='<div class="wx-day"><span class="d">'+(d===0?'Today':d===1?'Tomorrow':dn[dd.getUTCDay()])+'<small>'+dd.getUTCDate()+' '+mn[dd.getUTCMonth()]+'</small></span>'+wxIcon(dl.weather_code[d],1)+'<span class="cn">'+(WX[dl.weather_code[d]]||'')+'<small>Sun '+t12(sr[0],sr[1])+' – '+t12(ss[0],ss[1])+'</small></span><span class="wx-rng"><span>'+Math.round(mi)+'°</span><i><em style="left:'+((mi-L)/R*100).toFixed(0)+'%;right:'+((U-ma)/R*100).toFixed(0)+'%"></em></i><span>'+Math.round(ma)+'°</span></span><span class="rp">'+(dl.precipitation_probability_max[d]||0)+'% rain</span></div>';
    }
    $('wxDays').innerHTML=dh;
    $('wxUpd').textContent='Right now in Mayapur, updated at '+t12(now.getUTCHours(),now.getUTCMinutes())+' India time.';
  }
  function wxLoad(){
    return fetch('https://api.open-meteo.com/v1/forecast?latitude='+LAT+'&longitude='+LNG+'&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,is_day&hourly=temperature_2m,weather_code,precipitation_probability&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,uv_index_max,sunrise,sunset&timezone=Asia%2FKolkata&forecast_days=7')
    .then(function(r){return r.json();}).then(function(w){
      WXD=w;
      var c=w.current,dl=w.daily;
      $('gTemp').innerHTML=Math.round(c.temperature_2m)+'°<small>'+(WX[c.weather_code]||'')+'</small>';
      $('gWxSub').textContent='Humidity '+c.relative_humidity_2m+'% · today '+Math.round(dl.temperature_2m_min[0])+'° to '+Math.round(dl.temperature_2m_max[0])+'°'+(dl.precipitation_probability_max[0]!=null?' · rain '+dl.precipitation_probability_max[0]+'%':'');
      var dn=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],h='';
      for(var i=1;i<4;i++){var dd=new Date(dl.time[i]+'T00:00:00Z');h+='<div><span>'+dn[dd.getUTCDay()]+'</span><b>'+Math.round(dl.temperature_2m_max[i])+'° / '+Math.round(dl.temperature_2m_min[i])+'°</b><span>'+(WX[dl.weather_code[i]]||'')+'</span></div>';}
      $('gFc').innerHTML=h;
      var a=hm(dl.sunrise[0]),b=hm(dl.sunset[0]);
      $('gRise').textContent=t12(a[0],a[1]);$('gSet').textContent=t12(b[0],b[1]);
      SUN=[a[0]*60+a[1],b[0]*60+b[1]];sunDot();
      wxSheet();
    });
  }
  if($('gTemp')){
    wxLoad().catch(function(){$('gTemp').innerHTML='<small style="margin:0">Weather is not available right now</small>';$('gWxSub').textContent='';if($('wxUpd'))$('wxUpd').textContent='The forecast could not load right now. Please try again in a minute.';});
    setInterval(function(){if(!document.hidden)wxLoad().catch(function(){});},30*60000);
    window.addEventListener('hashchange',function(){if(location.hash==='#weather')wxSheet();});
  }

  /* tonight's price (from pricing.js) */
  var R=window.NikadiRates;
  if(R&&$('gPrD')){
    var td=R.today(),P=R.period(td),inr=function(n){return '₹'+Number(n).toLocaleString('en-IN');};
    $('gPrD').textContent=inr(P.double);$('gPrT').textContent=inr(P.twin);
    if(R.standard('double')>P.double){$('gPrDs').textContent=inr(R.standard('double'));$('gPrTs').textContent=inr(R.standard('twin'));}
    if(P.offer)$('gPrLbl').textContent="Tonight's price · "+P.offer.name;
  }

  /* how far am I */
  var fb=$('gFarBtn');
  if(fb)fb.addEventListener('click',function(){
    var out=$('gFar');
    if(!navigator.geolocation){out.textContent='Your browser cannot share your location. Tap Directions to open Google Maps.';return;}
    out.textContent='Finding you…';
    navigator.geolocation.getCurrentPosition(function(p){
      var R0=6371,dLa=(LAT-p.coords.latitude)*Math.PI/180,dLo=(LNG-p.coords.longitude)*Math.PI/180;
      var a=Math.sin(dLa/2)*Math.sin(dLa/2)+Math.cos(p.coords.latitude*Math.PI/180)*Math.cos(LAT*Math.PI/180)*Math.sin(dLo/2)*Math.sin(dLo/2);
      var km=R0*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
      out.innerHTML=km<0.3?'<b>You are here!</b> Look for the lit NIKADI GUEST HOUSE sign opposite Gate No. 4. Reception is on the first floor.'
        :km<3?'<b>'+(km<1?Math.round(km*1000)+' m':km.toFixed(1)+' km')+'</b> away (straight line). About '+Math.max(2,Math.round(km*13))+' minutes on foot, or hop on an e-rickshaw.'
        :'<b>'+Math.round(km)+' km</b> away (straight line). Tap Directions for the road route and travel time.';
    },function(){out.textContent='We could not get your location. Tap Directions to open Google Maps instead.';},{enableHighAccuracy:false,timeout:10000,maximumAge:300000});
  });

  /* book buttons focus the booking bar */
  document.addEventListener('click',function(e){
    var b=e.target.closest('[data-focus-book]');if(!b)return;
    var f=$('bookForm');if(!f)return;e.preventDefault();closeMenu();
    f.scrollIntoView({behavior:'smooth',block:'center'});setTimeout(function(){var ci=$('ci');if(ci)try{ci.focus({preventScroll:true});}catch(x){}},500);
  });

  /* phone menu */
  var menu=$('menu');
  function closeMenu(){if(menu&&!menu.hidden){menu.hidden=true;document.body.style.overflow='';}}
  if(menu){
    $('menuBtn').addEventListener('click',function(){menu.hidden=false;document.body.style.overflow='hidden';});
    menu.addEventListener('click',function(e){if(e.target===menu||e.target.closest('[data-menu-x]')||e.target.closest('a'))closeMenu();});
    document.addEventListener('keydown',function(e){if(e.key==='Escape')closeMenu();});
  }

  /* share + copy */
  function say(t){var m=$('cMsg');if(m){m.textContent=t;setTimeout(function(){m.textContent='';},3000);}}
  document.addEventListener('click',function(e){
    var s=e.target.closest('[data-share]');
    if(s){var d={title:'Nikadi Guest House, Mayapur',text:'AC rooms opposite ISKCON Gate No. 4, Sri Dham Mayapur',url:'https://www.nikadiguesthouse.com/'};
      if(navigator.share)navigator.share(d).catch(function(){});
      else if(navigator.clipboard)navigator.clipboard.writeText(d.url).then(function(){say('Website link copied');},function(){say(d.url);});
      else say(d.url);
      return;}
    var c=e.target.closest('[data-copy]');
    if(c){var v=c.getAttribute('data-copy');var done=function(){var o=c.textContent;c.textContent='Copied';setTimeout(function(){c.textContent=o;},1600);};
      if(navigator.clipboard)navigator.clipboard.writeText(v).then(done,function(){});}
  });

  /* quick message → WhatsApp */
  var q=$('qForm');
  if(q){
    var ci=q.elements.ci;try{ci.min=new Date(Date.now()+330*60000).toISOString().slice(0,10);}catch(x){}
    q.addEventListener('submit',function(e){
      e.preventDefault();var f=q.elements,L=['Hare Krishna! '+f.t.value+' from '+f.name.value.trim()+'.'];
      if(f.ci.value){var p=f.ci.value.split('-');L.push('Check-in: '+(+p[2])+' '+['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+p[1]-1]+' '+p[0]+' · '+f.n.value+' night'+(f.n.value==='1'?'':'s'));}
      L.push('Guests: '+f.g.value+' · Room: '+f.r.value);
      if(f.m.value.trim())L.push(f.m.value.trim());
      window.open('https://wa.me/917501101137?text='+encodeURIComponent(L.join('\n')),'_blank','noopener');
    });
  }
})();


}catch(e){console.error("[nikadi part 9]",e);}
/* part 10 */
try{

/* ---- v4: temple program (live next arati) + Instagram darshan embeds ---- */
(function(){
  function $(id){return document.getElementById(id);}
  var rows=[].slice.call(document.querySelectorAll('#prog li'));
  var CL=rows.filter(function(li){return li.classList.contains('closed');});rows=rows.filter(function(li){return !li.classList.contains('closed');});
  var P=rows.map(function(li){var t=li.getAttribute('data-t').split(':');return {li:li,m:+t[0]*60+(+t[1]),name:li.querySelector('.nm').textContent,time:li.querySelector('.tm').textContent.replace(/\s+/g,' ').trim()};});
  function dur(min){var h=Math.floor(min/60),m=min%60;return h?(h+' h'+(m?' '+m+' min':'')):m+' min';}
  function upd(){
    if(!P.length)return;
    var d=new Date(Date.now()+330*60000),now=d.getUTCHours()*60+d.getUTCMinutes();
    var cur=null,next=null;
    /* a program is live from its start until the next one begins (at most 90 min) */
    P.forEach(function(p,i){var nx=P[i+1],stop=Math.min(nx?nx.m:20*60+30,p.m+90);if(p.m<=now&&now<stop)cur=p;if(!next&&p.m>now)next=p;});
    var tomorrow=!next;if(tomorrow)next=P[0];
    var inMin=tomorrow?(24*60-now+next.m):next.m-now;
    var shutDay=now>=13*60&&now<16*60, shutNight=now>=20*60+30||now<4*60+30;
    if(shutDay||shutNight)cur=null;
    P.forEach(function(p){p.li.classList.toggle('done',!tomorrow&&p.m<=now&&p!==cur);p.li.classList.toggle('live',p===cur);p.li.classList.toggle('next',p===next&&!(shutDay||shutNight));});
    CL.forEach(function(li){var t=li.getAttribute('data-t');li.classList.toggle('next',(t==='13:00'&&shutDay)||(t==='20:30'&&shutNight));});
    var live=$('progLive');
    if(live){live.hidden=!cur;if(cur){$('progLiveName').textContent=cur.name;$('progLiveSub').textContent='Going on now · started at '+cur.time+(next&&!tomorrow?' · '+next.name+' at '+next.time:'');}}
    var head,sub;
    if(shutDay||shutNight){
      head=shutDay?'Temple closed now':'Temple closed for the night';
      sub=(shutDay?'All temples in Mayapur close 1–4 PM. Opens again with ':'Opens again with ')+next.name+' at '+next.time+' · in '+dur(inMin);
      if($('progNext')){$('progNext').textContent=head;$('progIn').textContent=sub;$('progNow').querySelector('.lbl').textContent='Temple timings';$('progNow').classList.add('shut');}
      if($('gArati')){if($('gAratiLbl'))$('gAratiLbl').textContent='Next at the temple';$('gArati').textContent=head;$('gAratiIn').textContent='Opens '+next.time+' ('+next.name+') · in '+dur(inMin);}
      return;
    }
    if($('progNow'))$('progNow').classList.remove('shut');
    head=next.name+' · '+next.time;sub=(tomorrow?'Tomorrow morning · in ':'In ')+dur(inMin);
    if($('progNext')){$('progNext').textContent=head;$('progIn').textContent=sub;$('progNow').querySelector('.lbl').textContent=tomorrow?'First program tomorrow':'Next at the temple';}
    if($('gArati')){if($('gAratiLbl'))$('gAratiLbl').textContent=cur?'At the temple now':'Next at the temple';$('gArati').textContent=cur?cur.name:next.name;$('gAratiIn').innerHTML=cur?'<span class="pill live" style="display:inline-block;margin-right:6px">● Live now</span>Next: '+next.name+' at '+next.time:next.time+' · '+(tomorrow?'tomorrow, in ':'in ')+dur(inMin);}
  }
  upd();setInterval(upd,30000);

  /* Instagram's own embed script, loaded only when the darshan row comes near the screen */
  var box=$('igs');
  if(box){
    var go=function(){if(window.__igl)return;window.__igl=1;var sc=document.createElement('script');sc.async=true;sc.src='https://www.instagram.com/embed.js';sc.onload=function(){try{window.instgrm&&window.instgrm.Embeds.process();}catch(e){}};document.body.appendChild(sc);};
    if('IntersectionObserver' in window){var io=new IntersectionObserver(function(es){if(es.some(function(e){return e.isIntersecting;})){go();io.disconnect();}},{rootMargin:'600px 0px'});io.observe(box);}else go();
  }
})();


}catch(e){console.error("[nikadi part 10]",e);}
/* part 11 */
try{

/* ---- v5: membership deck + Instagram loader for all rows ---- */
(function(){
  /* membership cards: Silver → Gold → Platinum → Platinum Plus */
  var deck=document.getElementById('mdeck');
  if(deck){
    var cards=[].slice.call(deck.querySelectorAll('.mcard')),tabs=[].slice.call(deck.querySelectorAll('.mdots button')),cur=0,timer=null;
    function show(n){
      var prev=cur;cur=(n+cards.length)%cards.length;
      cards.forEach(function(c,i){c.classList.toggle('on',i===cur);c.classList.toggle('prev',i===prev&&prev!==cur);});
      tabs.forEach(function(t,i){t.setAttribute('aria-selected',i===cur?'true':'false');});
    }
    function auto(){clearInterval(timer);timer=setInterval(function(){if(!document.hidden)show(cur+1);},3800);}
    tabs.forEach(function(t,i){t.addEventListener('click',function(){show(i);auto();});});
    var tiers=document.querySelectorAll('.tiers .tier');
    tiers.forEach(function(d,i){d.addEventListener('toggle',function(){if(d.open){show(i);auto();}});});
    if('IntersectionObserver' in window){new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting)auto();else clearInterval(timer);});}).observe(deck);}else auto();
  }
  /* Instagram's embed script: load once, when any post row comes near */
  var rows=document.querySelectorAll('.instagram-media');
  if(rows.length){
    var go=function(){if(window.__igl){try{window.instgrm&&window.instgrm.Embeds.process();}catch(e){}return;}window.__igl=1;var sc=document.createElement('script');sc.async=true;sc.src='https://www.instagram.com/embed.js';sc.onload=function(){try{window.instgrm&&window.instgrm.Embeds.process();}catch(e){}};document.body.appendChild(sc);};
    if('IntersectionObserver' in window){var io=new IntersectionObserver(function(es){if(es.some(function(e){return e.isIntersecting;})){go();io.disconnect();}},{rootMargin:'900px 0px'});rows.forEach(function(r){io.observe(r);});}else go();
  }
})();


}catch(e){console.error("[nikadi part 11]",e);}
/* part 12 */
try{

(function(){var r=document.getElementById('qrail');if(!r)return;var t=r.querySelector('.qr-toggle');
t.addEventListener('click',function(){var o=r.classList.toggle('open');t.setAttribute('aria-expanded',o?'true':'false');});
r.addEventListener('click',function(e){if(e.target.closest('.qr'))r.classList.remove('open');});
document.addEventListener('click',function(e){if(!e.target.closest('#qrail'))r.classList.remove('open');});})();

}catch(e){console.error("[nikadi part 12]",e);}
/* part 13 */
try{

/* transport: tabs + live next trains */
(function(){
  var sec=document.getElementById('transport'); if(!sec) return;
  var tabs=sec.querySelectorAll('[data-tp]'), panes=sec.querySelectorAll('[data-pane]');
  function show(k){tabs.forEach(function(t){t.setAttribute('aria-selected',t.getAttribute('data-tp')===k?'true':'false');});panes.forEach(function(p){p.hidden=p.getAttribute('data-pane')!==k;});}
  tabs.forEach(function(t){t.addEventListener('click',function(){show(t.getAttribute('data-tp'));});});
  if(location.hash==='#trains')show('train');
  function mins(t){var a=t.split(':');return +a[0]*60+(+a[1]);}
  function t12(t){var a=t.split(':'),h=+a[0];return (h%12||12)+':'+a[1]+(h<12?' AM':' PM');}
  function upd(){
    var d=new Date(Date.now()+330*60000),now=d.getUTCHours()*60+d.getUTCMinutes();
    sec.querySelectorAll('.nxt').forEach(function(box){
      var list=box.nextElementSibling.querySelectorAll('.tr'),up=[];
      var wd=d.getUTCDay();list.forEach(function(li){var ds=li.getAttribute('data-days')||'Daily',runs=ds==='Daily'||(ds.indexOf('only')>0?wd===0:wd!==0);li.classList.toggle('off',!runs);var m=mins(li.getAttribute('data-d'));li.classList.toggle('gone',m<now);li.classList.remove('soon');if(m>=now&&runs)up.push(li);});
      var tomorrow=false; if(!up.length){up=[].slice.call(list).filter(function(li){return (li.getAttribute('data-days')||'Daily')==='Daily';});tomorrow=true;}
      up=up.slice(0,3); if(up[0])up[0].classList.add('soon');
      var dl=box.nextElementSibling.querySelector('.dl').textContent;
      box.innerHTML='<span class="nl">Next trains · '+dl+(tomorrow?' · tomorrow':'')+'</span>'+up.map(function(li){var m=mins(li.getAttribute('data-d')),inm=tomorrow?(24*60-now+m):(m-now),h=Math.floor(inm/60);return '<span class="nc'+(li.classList.contains('ac')?' ac':'')+'"><b>'+t12(li.getAttribute('data-d'))+'</b>'+(li.classList.contains('ac')?' AC':'')+' <small>'+(inm<1?'now':'in '+(h?h+' h':'')+(inm%60?(h?' ':'')+(inm%60)+' min':''))+'</small></span>';}).join('');
    });
  }
  upd(); setInterval(upd,30000);
})();

}catch(e){console.error("[nikadi part 13]",e);}
/* part 14 */
try{

(function(){
  var sk=[].slice.call(document.querySelectorAll('#transport .dir'))[0]; if(!sk||!document.getElementById('gTrain'))return;
  function mins(t){var a=t.split(':');return +a[0]*60+(+a[1]);}
  function t12(t){var a=t.split(':'),h=+a[0];return (h%12||12)+':'+a[1]+(h<12?' AM':' PM');}
  function dur(m){var h=Math.floor(m/60),r=m%60;return m<1?'a moment':(h?h+' h':'')+(r?(h?' ':'')+r+' min':'');}
  function upd(){
    var d=new Date(Date.now()+330*60000),now=d.getUTCHours()*60+d.getUTCMinutes();
    var wd=d.getUTCDay();var rows=[].slice.call(sk.querySelectorAll('.tr')).filter(function(li){var ds=li.getAttribute('data-days')||'Daily';return ds==='Daily'||(ds.indexOf('only')>0?wd===0:wd!==0);}).map(function(li){return {t:li.getAttribute('data-d'),ac:li.classList.contains('ac'),arr:li.querySelector('span').textContent.replace('→ ','')};});
    var nx=rows.filter(function(r){return mins(r.t)>=now;}),tm=!nx.length; if(tm)nx=rows;
    var n=nx[0],inm=tm?24*60-now+mins(n.t):mins(n.t)-now;
    document.getElementById('gTrain').textContent=t12(n.t)+(n.ac?' AC':'');
    document.getElementById('gTrainIn').textContent='Sealdah → Krishnanagar · '+(tm?'tomorrow, ':'')+'in '+dur(inm)+' · arrives '+n.arr;
    var ac=nx.filter(function(r){return r.ac;})[0];
    document.getElementById('gTrainAc').textContent=ac&&ac!==n?'Next AC local: '+t12(ac.t)+' (arrives '+ac.arr+')':(n.ac?'This one is the AC local':'No more AC locals today');
  }
  upd();setInterval(upd,30000);
  document.querySelectorAll('[data-tp-go]').forEach(function(a){a.addEventListener('click',function(){var b=document.querySelector('#transport [data-tp="'+a.getAttribute('data-tp-go')+'"]');if(b)b.click();});});
})();

}catch(e){console.error("[nikadi part 14]",e);}
/* part 15 */
try{

/* train details: tap a train time (exact NTES timetable) */
window.NK_TRAINS={"13103":{"d":"Daily","s":[["Sealdah","18:20"],["Ranaghat Jn","19:48"],["Krishnanagar City Jn","20:12"]],"k":"sk","n":"Bhagirathi Express","t":"EXP"},"13104":{"d":"Daily","s":[["Krishnanagar City Jn","08:02"],["Ranaghat Jn","08:34"],["Sealdah","10:25"]],"k":"ks","n":"Bhagirathi Express","t":"EXP"},"13465":{"d":"Daily","s":[["Howrah Jn","14:00"],["Bandel","14:55"],["Ambika Kalna","15:25"],["Nabadwip Dham","15:45"]],"k":"hn","n":"Howrah – Malda Town Intercity Express","t":"EXP"},"13466":{"d":"Daily","s":[["Nabadwip Dham","10:03"],["Ambika Kalna","10:22"],["Bandel","11:10"],["Howrah Jn","12:40"]],"k":"nh","n":"Malda Town – Howrah Intercity Express","t":"EXP"},"31801":{"d":"Mon–Sat (not Sunday)","s":[["Sealdah","17:05"],["Bidhannagar Road","17:12"],["Dum Dum Jn","17:16"],["Belgharia","17:21"],["Agarpara","17:24"],["Sodpur","17:27"],["Khardaha","17:31"],["Titagarh","17:34"],["Barrackpore","17:44"],["Palta","17:47"],["Ichhapur","17:50"],["Shyamnagar","17:55"],["Jagadal","17:59"],["Kankinara","18:03"],["Naihati Jn","18:10"],["Halisahar","18:14"],["Kanchrapara","18:18"],["Kalyani","18:22"],["Madanpur","18:27"],["Simurali","18:32"],["Palpara","18:35"],["Chakdaha","18:38"],["Payradanga","18:49"],["Ranaghat Jn","18:56"],["Kalinarayanpur Jn","19:03"],["Birnagar","19:07"],["Taherpur","19:10"],["Badkulla","19:15"],["Krishnanagar City Jn","19:29"]],"k":"sk","n":"Sealdah – Krishnanagar Local","t":""},"31802":{"d":"Mon–Sat (not Sunday)","s":[["Krishnanagar City Jn","08:40"],["Badkulla","08:47"],["Taherpur","08:52"],["Birnagar","08:55"],["Kalinarayanpur Jn","09:02"],["Ranaghat Jn","09:11"],["Payradanga","09:16"],["Chakdaha","09:21"],["Palpara","09:24"],["Simurali","09:27"],["Madanpur","09:29"],["Kalyani","09:38"],["Kanchrapara","09:41"],["Halisahar","09:47"],["Naihati Jn","09:56"],["Kankinara","10:00"],["Jagadal","10:03"],["Shyamnagar","10:06"],["Ichhapur","10:10"],["Palta","10:13"],["Barrackpore","10:18"],["Titagarh","10:21"],["Khardaha","10:24"],["Sodpur","10:28"],["Agarpara","10:31"],["Belgharia","10:34"],["Dum Dum Jn","10:41"],["Bidhannagar Road","10:45"],["Sealdah","11:00"]],"k":"ks","n":"Krishnanagar – Sealdah Local","t":""},"31811":{"d":"Daily","s":[["Sealdah","03:20"],["Bidhannagar Road","03:27"],["Dum Dum Jn","03:31"],["Belgharia","03:36"],["Agarpara","03:39"],["Sodpur","03:42"],["Khardaha","03:46"],["Titagarh","03:49"],["Barrackpore","03:53"],["Palta","03:56"],["Ichhapur","03:59"],["Shyamnagar","04:03"],["Jagadal","04:07"],["Kankinara","04:09"],["Naihati Jn","04:21"],["Halisahar","04:26"],["Kanchrapara","04:30"],["Kalyani","04:34"],["Madanpur","04:39"],["Simurali","04:43"],["Palpara","04:46"],["Chakdaha","04:49"],["Payradanga","04:54"],["Ranaghat Jn","05:12"],["Kalinarayanpur Jn","05:24"],["Birnagar","05:28"],["Taherpur","05:31"],["Badkulla","05:36"],["Krishnanagar City Jn","05:48"]],"k":"sk","n":"Sealdah – Krishnanagar Local","t":""},"31812":{"d":"Daily","s":[["Krishnanagar City Jn","04:20"],["Jalalkhali Halt","04:23"],["Badkulla","04:29"],["Taherpur","04:34"],["Birnagar","04:38"],["Kalinarayanpur Jn","04:42"],["Ranaghat Jn","04:57"],["Payradanga","05:02"],["Chakdaha","05:07"],["Palpara","05:10"],["Simurali","05:13"],["Madanpur","05:17"],["Kalyani","05:22"],["Kanchrapara","05:25"],["Halisahar","05:28"],["Naihati Jn","05:43"],["Kankinara","05:47"],["Shyamnagar","05:52"],["Ichhapur","05:56"],["Palta","05:59"],["Barrackpore","06:03"],["Titagarh","06:06"],["Khardaha","06:09"],["Sodpur","06:13"],["Agarpara","06:16"],["Belgharia","06:19"],["Dum Dum Jn","06:26"],["Bidhannagar Road","06:30"],["Sealdah","06:46"]],"k":"ks","n":"Krishnanagar – Sealdah Local","t":""},"31813":{"d":"Mon–Sat (not Sunday)","s":[["Sealdah","05:37"],["Bidhannagar Road","05:44"],["Dum Dum Jn","05:48"],["Belgharia","05:53"],["Agarpara","05:56"],["Sodpur","05:59"],["Khardaha","06:03"],["Titagarh","06:06"],["Barrackpore","06:13"],["Palta","06:16"],["Ichhapur","06:19"],["Shyamnagar","06:24"],["Jagadal","06:28"],["Kankinara","06:31"],["Naihati Jn","06:39"],["Halisahar","06:43"],["Kanchrapara","06:47"],["Kalyani","06:51"],["Madanpur","06:56"],["Simurali","07:00"],["Palpara","07:03"],["Chakdaha","07:06"],["Payradanga","07:11"],["Ranaghat Jn","07:25"],["Kalinarayanpur Jn","07:31"],["Birnagar","07:35"],["Taherpur","07:38"],["Badkulla","07:43"],["Jalalkhali Halt","07:48"],["Krishnanagar City Jn","08:00"]],"k":"sk","n":"Sealdah – Krishnanagar Local","t":""},"31814":{"d":"Daily","s":[["Krishnanagar City Jn","05:00"],["Badkulla","05:07"],["Taherpur","05:12"],["Birnagar","05:15"],["Kalinarayanpur Jn","05:19"],["Ranaghat Jn","05:33"],["Payradanga","05:38"],["Chakdaha","05:43"],["Palpara","05:46"],["Simurali","05:49"],["Madanpur","05:53"],["Kalyani","05:58"],["Kanchrapara","06:01"],["Halisahar","06:04"],["Naihati Jn","06:12"],["Kankinara","06:16"],["Jagadal","06:19"],["Shyamnagar","06:22"],["Ichhapur","06:26"],["Palta","06:29"],["Barrackpore","06:33"],["Dum Dum Jn","06:55"],["Sealdah","07:12"]],"k":"ks","n":"Krishnanagar – Sealdah Local","t":""},"31815":{"d":"Daily","s":[["Sealdah","06:10"],["Bidhannagar Road","06:17"],["Dum Dum Jn","06:21"],["Belgharia","06:26"],["Agarpara","06:29"],["Sodpur","06:32"],["Khardaha","06:36"],["Titagarh","06:39"],["Barrackpore","06:43"],["Palta","06:46"],["Ichhapur","06:49"],["Shyamnagar","06:53"],["Jagadal","06:57"],["Kankinara","07:01"],["Naihati Jn","07:09"],["Halisahar","07:13"],["Kanchrapara","07:18"],["Kalyani","07:22"],["Madanpur","07:27"],["Simurali","07:31"],["Palpara","07:34"],["Chakdaha","07:37"],["Payradanga","07:49"],["Ranaghat Jn","07:58"],["Kalinarayanpur Jn","08:04"],["Birnagar","08:08"],["Taherpur","08:11"],["Badkulla","08:16"],["Krishnanagar City Jn","08:34"]],"k":"sk","n":"Sealdah – Krishnanagar Local","t":""},"31816":{"d":"Daily","s":[["Krishnanagar City Jn","06:07"],["Jalalkhali Halt","06:10"],["Badkulla","06:14"],["Taherpur","06:19"],["Birnagar","06:22"],["Kalinarayanpur Jn","06:26"],["Ranaghat Jn","06:39"],["Payradanga","06:44"],["Chakdaha","06:49"],["Palpara","06:52"],["Simurali","06:55"],["Madanpur","06:59"],["Kalyani","07:04"],["Kanchrapara","07:07"],["Halisahar","07:14"],["Naihati Jn","07:23"],["Kankinara","07:27"],["Jagadal","07:30"],["Shyamnagar","07:33"],["Ichhapur","07:37"],["Palta","07:40"],["Barrackpore","07:44"],["Titagarh","07:47"],["Khardaha","07:50"],["Sodpur","07:54"],["Agarpara","07:57"],["Belgharia","08:00"],["Dum Dum Jn","08:06"],["Bidhannagar Road","08:10"],["Sealdah","08:27"]],"k":"ks","n":"Krishnanagar – Sealdah Local","t":""},"31817":{"d":"Daily","s":[["Sealdah","06:55"],["Bidhannagar Road","07:02"],["Dum Dum Jn","07:06"],["Belgharia","07:11"],["Agarpara","07:14"],["Sodpur","07:17"],["Khardaha","07:21"],["Titagarh","07:24"],["Barrackpore","07:28"],["Palta","07:31"],["Ichhapur","07:34"],["Shyamnagar","07:38"],["Jagadal","07:42"],["Kankinara","07:44"],["Naihati Jn","07:58"],["Halisahar","08:03"],["Kanchrapara","08:07"],["Kalyani","08:11"],["Madanpur","08:16"],["Simurali","08:20"],["Palpara","08:23"],["Chakdaha","08:26"],["Payradanga","08:33"],["Ranaghat Jn","08:44"],["Kalinarayanpur Jn","08:50"],["Birnagar","08:54"],["Taherpur","08:57"],["Badkulla","09:02"],["Jalalkhali Halt","09:07"],["Krishnanagar City Jn","09:22"]],"k":"sk","n":"Sealdah – Krishnanagar Local","t":""},"31818":{"d":"Daily","s":[["Krishnanagar City Jn","07:04"],["Jalalkhali Halt","07:07"],["Badkulla","07:12"],["Taherpur","07:17"],["Birnagar","07:20"],["Kalinarayanpur Jn","07:24"],["Ranaghat Jn","07:38"],["Payradanga","07:43"],["Chakdaha","07:48"],["Palpara","07:51"],["Simurali","07:54"],["Madanpur","07:58"],["Kalyani","08:03"],["Kanchrapara","08:06"],["Halisahar","08:11"],["Naihati Jn","08:17"],["Kankinara","08:21"],["Shyamnagar","08:26"],["Ichhapur","08:30"],["Barrackpore","08:42"],["Khardaha","08:48"],["Belgharia","08:58"],["Dum Dum Jn","09:04"],["Bidhannagar Road","09:08"],["Sealdah","09:22"]],"k":"ks","n":"Krishnanagar – Sealdah Local","t":""},"31819":{"d":"Daily","s":[["Sealdah","07:52"],["Bidhannagar Road","07:59"],["Dum Dum Jn","08:03"],["Barrackpore","08:29"],["Naihati Jn","08:49"],["Halisahar","08:53"],["Kanchrapara","08:57"],["Kalyani","09:01"],["Madanpur","09:06"],["Simurali","09:10"],["Palpara","09:13"],["Chakdaha","09:16"],["Payradanga","09:27"],["Ranaghat Jn","09:35"],["Kalinarayanpur Jn","09:41"],["Birnagar","09:45"],["Taherpur","09:48"],["Badkulla","09:58"],["Krishnanagar City Jn","10:10"]],"k":"sk","n":"Sealdah – Krishnanagar Local","t":""},"31820":{"d":"Daily","s":[["Krishnanagar City Jn","09:00"],["Jalalkhali Halt","09:03"],["Badkulla","09:07"],["Taherpur","09:12"],["Birnagar","09:15"],["Kalinarayanpur Jn","09:20"],["Ranaghat Jn","09:30"],["Payradanga","09:35"],["Chakdaha","09:40"],["Palpara","09:43"],["Simurali","09:46"],["Madanpur","09:50"],["Kalyani","09:55"],["Kanchrapara","09:58"],["Halisahar","10:02"],["Naihati Jn","10:10"],["Kankinara","10:14"],["Jagadal","10:17"],["Shyamnagar","10:20"],["Ichhapur","10:24"],["Palta","10:27"],["Barrackpore","10:35"],["Titagarh","10:38"],["Khardaha","10:41"],["Sodpur","10:45"],["Agarpara","10:48"],["Belgharia","10:51"],["Dum Dum Jn","10:59"],["Bidhannagar Road","11:03"],["Sealdah","11:22"]],"k":"ks","n":"Krishnanagar – Sealdah Local","t":""},"31821":{"d":"Daily","s":[["Sealdah","09:34"],["Bidhannagar Road","09:41"],["Dum Dum Jn","09:45"],["Barrackpore","10:09"],["Shyamnagar","10:17"],["Naihati Jn","10:29"],["Halisahar","10:33"],["Kanchrapara","10:37"],["Kalyani","10:41"],["Madanpur","10:46"],["Simurali","10:50"],["Palpara","10:53"],["Chakdaha","10:56"],["Payradanga","11:01"],["Ranaghat Jn","11:17"],["Kalinarayanpur Jn","11:23"],["Birnagar","11:27"],["Taherpur","11:30"],["Badkulla","11:35"],["Jalalkhali Halt","11:40"],["Krishnanagar City Jn","11:50"]],"k":"sk","n":"Sealdah – Krishnanagar Local","t":""},"31822":{"d":"Daily","s":[["Krishnanagar City Jn","09:50"],["Jalalkhali Halt","09:53"],["Badkulla","09:58"],["Taherpur","10:03"],["Birnagar","10:06"],["Kalinarayanpur Jn","10:10"],["Ranaghat Jn","10:23"],["Payradanga","10:28"],["Chakdaha","10:33"],["Palpara","10:36"],["Simurali","10:39"],["Madanpur","10:43"],["Kalyani","10:48"],["Kanchrapara","10:51"],["Halisahar","10:54"],["Naihati Jn","11:03"],["Kankinara","11:07"],["Shyamnagar","11:12"],["Ichhapur","11:16"],["Palta","11:19"],["Barrackpore","11:23"],["Titagarh","11:26"],["Khardaha","11:29"],["Sodpur","11:33"],["Agarpara","11:36"],["Belgharia","11:39"],["Dum Dum Jn","11:45"],["Bidhannagar Road","11:49"],["Sealdah","12:10"]],"k":"ks","n":"Krishnanagar – Sealdah Local","t":""},"31824":{"d":"Daily","s":[["Krishnanagar City Jn","12:12"],["Jalalkhali Halt","12:15"],["Badkulla","12:19"],["Taherpur","12:24"],["Birnagar","12:27"],["Kalinarayanpur Jn","12:31"],["Ranaghat Jn","12:43"],["Payradanga","12:48"],["Chakdaha","12:53"],["Palpara","12:56"],["Simurali","12:59"],["Madanpur","13:03"],["Kalyani","13:08"],["Kanchrapara","13:11"],["Halisahar","13:14"],["Naihati Jn","13:21"],["Kankinara","13:25"],["Shyamnagar","13:30"],["Ichhapur","13:34"],["Palta","13:37"],["Barrackpore","13:41"],["Titagarh","13:44"],["Khardaha","13:47"],["Sodpur","13:51"],["Agarpara","13:54"],["Belgharia","13:57"],["Dum Dum Jn","14:03"],["Bidhannagar Road","14:07"],["Sealdah","14:30"]],"k":"ks","n":"Krishnanagar – Sealdah Local","t":""},"31825":{"d":"Daily","s":[["Sealdah","10:52"],["Bidhannagar Road","10:59"],["Dum Dum Jn","11:03"],["Belgharia","11:08"],["Agarpara","11:11"],["Sodpur","11:14"],["Khardaha","11:18"],["Titagarh","11:21"],["Barrackpore","11:28"],["Palta","11:31"],["Ichhapur","11:34"],["Shyamnagar","11:38"],["Jagadal","11:42"],["Kankinara","11:47"],["Naihati Jn","11:55"],["Halisahar","11:59"],["Kanchrapara","12:03"],["Kalyani","12:07"],["Madanpur","12:12"],["Simurali","12:16"],["Palpara","12:19"],["Chakdaha","12:22"],["Payradanga","12:27"],["Ranaghat Jn","12:41"],["Kalinarayanpur Jn","12:47"],["Birnagar","12:51"],["Taherpur","12:54"],["Badkulla","13:05"],["Krishnanagar City Jn","13:18"]],"k":"sk","n":"Sealdah – Krishnanagar Local","t":""},"31827":{"d":"Daily","s":[["Sealdah","12:05"],["Bidhannagar Road","12:12"],["Dum Dum Jn","12:16"],["Belgharia","12:21"],["Agarpara","12:24"],["Sodpur","12:27"],["Khardaha","12:31"],["Titagarh","12:34"],["Barrackpore","12:38"],["Palta","12:41"],["Ichhapur","12:44"],["Shyamnagar","12:48"],["Kankinara","12:53"],["Naihati Jn","13:05"],["Halisahar","13:10"],["Kanchrapara","13:14"],["Kalyani","13:18"],["Madanpur","13:23"],["Simurali","13:27"],["Palpara","13:30"],["Chakdaha","13:33"],["Payradanga","13:38"],["Ranaghat Jn","13:53"],["Kalinarayanpur Jn","13:59"],["Birnagar","14:03"],["Taherpur","14:06"],["Badkulla","14:11"],["Jalalkhali Halt","14:16"],["Krishnanagar City Jn","14:26"]],"k":"sk","n":"Sealdah – Krishnanagar Local","t":""},"31828":{"d":"Daily","s":[["Krishnanagar City Jn","14:15"],["Badkulla","14:22"],["Taherpur","14:26"],["Birnagar","14:28"],["Kalinarayanpur Jn","14:35"],["Ranaghat Jn","14:45"],["Chakdaha","14:55"],["Kalyani","15:08"],["Kanchrapara","15:11"],["Naihati Jn","15:22"],["Barrackpore","15:39"],["Dum Dum Jn","15:55"],["Sealdah","16:15"]],"k":"ks","n":"Krishnanagar – Sealdah Local","t":""},"31829":{"d":"Daily","s":[["Sealdah","13:15"],["Bidhannagar Road","13:22"],["Dum Dum Jn","13:26"],["Belgharia","13:31"],["Agarpara","13:34"],["Sodpur","13:37"],["Khardaha","13:41"],["Titagarh","13:44"],["Barrackpore","13:49"],["Palta","13:52"],["Ichhapur","13:55"],["Shyamnagar","14:02"],["Jagadal","14:06"],["Kankinara","14:11"],["Naihati Jn","14:17"],["Halisahar","14:21"],["Kanchrapara","14:25"],["Kalyani","14:29"],["Madanpur","14:34"],["Simurali","14:38"],["Palpara","14:41"],["Chakdaha","14:44"],["Payradanga","14:50"],["Ranaghat Jn","15:03"],["Kalinarayanpur Jn","15:09"],["Birnagar","15:13"],["Taherpur","15:16"],["Badkulla","15:21"],["Jalalkhali Halt","15:26"],["Krishnanagar City Jn","15:35"]],"k":"sk","n":"Sealdah – Krishnanagar Local","t":""},"31830":{"d":"Daily","s":[["Krishnanagar City Jn","15:20"],["Jalalkhali Halt","15:23"],["Badkulla","15:28"],["Taherpur","15:33"],["Birnagar","15:36"],["Kalinarayanpur Jn","15:40"],["Ranaghat Jn","15:52"],["Payradanga","15:57"],["Chakdaha","16:02"],["Palpara","16:05"],["Simurali","16:08"],["Madanpur","16:12"],["Kalyani","16:17"],["Kanchrapara","16:20"],["Halisahar","16:23"],["Naihati Jn","16:30"],["Kankinara","16:34"],["Shyamnagar","16:39"],["Ichhapur","16:43"],["Palta","16:46"],["Barrackpore","16:50"],["Titagarh","16:53"],["Khardaha","16:56"],["Sodpur","17:00"],["Agarpara","17:03"],["Belgharia","17:06"],["Dum Dum Jn","17:12"],["Bidhannagar Road","17:16"],["Sealdah","17:37"]],"k":"ks","n":"Krishnanagar – Sealdah Local","t":""},"31831":{"d":"Daily","s":[["Sealdah","15:25"],["Bidhannagar Road","15:32"],["Dum Dum Jn","15:36"],["Belgharia","15:41"],["Agarpara","15:44"],["Sodpur","15:47"],["Khardaha","15:51"],["Titagarh","15:54"],["Barrackpore","15:58"],["Palta","16:01"],["Ichhapur","16:04"],["Shyamnagar","16:08"],["Jagadal","16:12"],["Kankinara","16:14"],["Naihati Jn","16:26"],["Halisahar","16:30"],["Kanchrapara","16:35"],["Kalyani","16:43"],["Madanpur","16:48"],["Simurali","16:52"],["Palpara","16:55"],["Chakdaha","16:58"],["Payradanga","17:03"],["Ranaghat Jn","17:15"],["Kalinarayanpur Jn","17:21"],["Birnagar","17:25"],["Taherpur","17:28"],["Badkulla","17:39"],["Jalalkhali Halt","17:44"],["Krishnanagar City Jn","17:50"]],"k":"sk","n":"Sealdah – Krishnanagar Local","t":""},"31832":{"d":"Daily","s":[["Krishnanagar City Jn","16:20"],["Badkulla","16:27"],["Taherpur","16:32"],["Birnagar","16:35"],["Kalinarayanpur Jn","16:39"],["Ranaghat Jn","16:51"],["Payradanga","16:56"],["Chakdaha","17:01"],["Palpara","17:04"],["Simurali","17:07"],["Madanpur","17:11"],["Kalyani","17:16"],["Kanchrapara","17:19"],["Halisahar","17:23"],["Naihati Jn","17:38"],["Kankinara","17:42"],["Jagadal","17:45"],["Shyamnagar","17:48"],["Ichhapur","17:52"],["Palta","17:55"],["Barrackpore","17:59"],["Khardaha","18:05"],["Agarpara","18:12"],["Dum Dum Jn","18:21"],["Bidhannagar Road","18:25"],["Sealdah","18:40"]],"k":"ks","n":"Krishnanagar – Sealdah Local","t":""},"31833":{"d":"Daily","s":[["Sealdah","16:08"],["Dum Dum Jn","16:19"],["Sodpur","16:28"],["Barrackpore","16:36"],["Palta","16:39"],["Ichhapur","16:42"],["Shyamnagar","16:46"],["Jagadal","16:50"],["Kankinara","16:57"],["Naihati Jn","17:08"],["Halisahar","17:12"],["Kanchrapara","17:17"],["Kalyani","17:21"],["Madanpur","17:26"],["Simurali","17:30"],["Palpara","17:33"],["Chakdaha","17:38"],["Payradanga","17:46"],["Ranaghat Jn","18:00"],["Kalinarayanpur Jn","18:07"],["Birnagar","18:11"],["Taherpur","18:14"],["Badkulla","18:19"],["Krishnanagar City Jn","18:35"]],"k":"sk","n":"Sealdah – Krishnanagar Local","t":""},"31834":{"d":"Daily","s":[["Krishnanagar City Jn","18:32"],["Jalalkhali Halt","18:35"],["Badkulla","18:40"],["Taherpur","18:45"],["Birnagar","18:48"],["Kalinarayanpur Jn","18:58"],["Ranaghat Jn","19:11"],["Payradanga","19:16"],["Chakdaha","19:21"],["Palpara","19:24"],["Simurali","19:27"],["Madanpur","19:31"],["Kalyani","19:36"],["Kanchrapara","19:39"],["Halisahar","19:42"],["Naihati Jn","19:55"],["Kankinara","19:59"],["Shyamnagar","20:04"],["Ichhapur","20:08"],["Palta","20:11"],["Barrackpore","20:16"],["Titagarh","20:19"],["Khardaha","20:22"],["Sodpur","20:26"],["Agarpara","20:29"],["Belgharia","20:32"],["Dum Dum Jn","20:38"],["Sealdah","20:58"]],"k":"ks","n":"Krishnanagar – Sealdah Local","t":""},"31835":{"d":"Daily","s":[["Sealdah","17:34"],["Dum Dum Jn","17:44"],["Barrackpore","18:03"],["Shyamnagar","18:15"],["Naihati Jn","18:30"],["Kanchrapara","18:38"],["Kalyani","18:42"],["Madanpur","18:47"],["Simurali","18:54"],["Chakdaha","18:59"],["Ranaghat Jn","19:16"],["Kalinarayanpur Jn","19:23"],["Birnagar","19:27"],["Taherpur","19:30"],["Badkulla","19:35"],["Jalalkhali Halt","19:40"],["Krishnanagar City Jn","19:49"]],"k":"sk","n":"Sealdah – Krishnanagar Local","t":""},"31836":{"d":"Daily","s":[["Krishnanagar City Jn","19:24"],["Badkulla","19:31"],["Taherpur","19:36"],["Birnagar","19:39"],["Kalinarayanpur Jn","19:43"],["Ranaghat Jn","19:57"],["Payradanga","20:02"],["Chakdaha","20:07"],["Palpara","20:10"],["Simurali","20:13"],["Madanpur","20:17"],["Kalyani","20:22"],["Kanchrapara","20:25"],["Halisahar","20:30"],["Naihati Jn","20:40"],["Shyamnagar","20:49"],["Palta","20:55"],["Barrackpore","21:01"],["Titagarh","21:04"],["Khardaha","21:07"],["Sodpur","21:11"],["Agarpara","21:14"],["Belgharia","21:17"],["Dum Dum Jn","21:23"],["Bidhannagar Road","21:27"],["Sealdah","21:43"]],"k":"ks","n":"Krishnanagar – Sealdah Local","t":""},"31837":{"d":"Daily","s":[["Sealdah","18:43"],["Dum Dum Jn","18:54"],["Barrackpore","19:10"],["Ichhapur","19:15"],["Shyamnagar","19:19"],["Jagadal","19:23"],["Kankinara","19:31"],["Naihati Jn","19:37"],["Halisahar","19:41"],["Kanchrapara","19:45"],["Kalyani","19:49"],["Madanpur","19:54"],["Simurali","19:58"],["Palpara","20:01"],["Chakdaha","20:04"],["Payradanga","20:15"],["Ranaghat Jn","20:26"],["Kalinarayanpur Jn","20:32"],["Birnagar","20:36"],["Taherpur","20:39"],["Badkulla","20:44"],["Jalalkhali Halt","20:48"],["Krishnanagar City Jn","20:59"]],"k":"sk","n":"Sealdah – Krishnanagar Local","t":""},"31838":{"d":"Mon–Sat (not Sunday)","s":[["Krishnanagar City Jn","20:00"],["Jalalkhali Halt","20:03"],["Badkulla","20:07"],["Taherpur","20:12"],["Birnagar","20:15"],["Kalinarayanpur Jn","20:21"],["Ranaghat Jn","20:35"],["Payradanga","20:40"],["Chakdaha","20:45"],["Palpara","20:48"],["Simurali","20:51"],["Madanpur","20:55"],["Kalyani","21:00"],["Kanchrapara","21:03"],["Halisahar","21:06"],["Naihati Jn","21:18"],["Kankinara","21:22"],["Jagadal","21:25"],["Shyamnagar","21:28"],["Ichhapur","21:32"],["Palta","21:35"],["Barrackpore","21:39"],["Titagarh","21:42"],["Khardaha","21:45"],["Sodpur","21:49"],["Agarpara","21:52"],["Belgharia","21:55"],["Dum Dum Jn","22:01"],["Bidhannagar Road","22:05"],["Sealdah","22:25"]],"k":"ks","n":"Krishnanagar – Sealdah Local","t":""},"31840":{"d":"Daily","s":[["Krishnanagar City Jn","20:25"],["Badkulla","20:32"],["Taherpur","20:37"],["Birnagar","20:40"],["Kalinarayanpur Jn","20:44"],["Ranaghat Jn","21:02"],["Payradanga","21:12"],["Chakdaha","21:17"],["Simurali","21:22"],["Madanpur","21:26"],["Kalyani","21:31"],["Kanchrapara","21:34"],["Naihati Jn","21:54"],["Barrackpore","22:14"],["Dum Dum Jn","22:33"],["Sealdah","22:55"]],"k":"ks","n":"Krishnanagar – Sealdah Local","t":""},"31841":{"d":"Daily","s":[["Sealdah","19:35"],["Bidhannagar Road","19:42"],["Dum Dum Jn","19:46"],["Belgharia","19:51"],["Agarpara","19:54"],["Sodpur","19:57"],["Khardaha","20:01"],["Titagarh","20:04"],["Barrackpore","20:08"],["Palta","20:11"],["Ichhapur","20:14"],["Shyamnagar","20:18"],["Jagadal","20:22"],["Kankinara","20:29"],["Naihati Jn","20:35"],["Halisahar","20:39"],["Kanchrapara","20:43"],["Kalyani","20:47"],["Madanpur","20:52"],["Simurali","20:59"],["Palpara","21:02"],["Chakdaha","21:06"],["Payradanga","21:16"],["Ranaghat Jn","21:23"],["Kalinarayanpur Jn","21:33"],["Birnagar","21:37"],["Taherpur","21:40"],["Badkulla","21:45"],["Krishnanagar City Jn","21:57"]],"k":"sk","n":"Sealdah – Krishnanagar Local","t":""},"31843":{"d":"Daily","s":[["Sealdah","21:00"],["Bidhannagar Road","21:07"],["Dum Dum Jn","21:11"],["Belgharia","21:16"],["Agarpara","21:19"],["Sodpur","21:22"],["Khardaha","21:26"],["Titagarh","21:29"],["Barrackpore","21:33"],["Palta","21:36"],["Ichhapur","21:39"],["Shyamnagar","21:48"],["Kankinara","21:53"],["Naihati Jn","22:01"],["Halisahar","22:05"],["Kanchrapara","22:09"],["Kalyani","22:13"],["Madanpur","22:18"],["Simurali","22:22"],["Palpara","22:25"],["Chakdaha","22:28"],["Payradanga","22:33"],["Ranaghat Jn","22:51"],["Kalinarayanpur Jn","22:57"],["Birnagar","23:01"],["Taherpur","23:04"],["Badkulla","23:09"],["Jalalkhali Halt","23:14"],["Krishnanagar City Jn","23:22"]],"k":"sk","n":"Sealdah – Krishnanagar Local","t":""},"31844":{"d":"Daily","s":[["Krishnanagar City Jn","22:22"],["Jalalkhali Halt","22:25"],["Badkulla","22:30"],["Taherpur","22:35"],["Birnagar","22:38"],["Kalinarayanpur Jn","22:44"],["Ranaghat Jn","22:53"],["Payradanga","22:58"],["Chakdaha","23:03"],["Palpara","23:06"],["Simurali","23:09"],["Madanpur","23:13"],["Kalyani","23:18"],["Kanchrapara","23:21"],["Halisahar","23:24"],["Naihati Jn","23:32"],["Kankinara","23:36"],["Jagadal","23:39"],["Shyamnagar","23:42"],["Ichhapur","23:46"],["Palta","23:49"],["Barrackpore","23:53"],["Titagarh","23:56"],["Khardaha","23:59"],["Sodpur","00:03"],["Agarpara","00:06"],["Belgharia","00:09"],["Dum Dum Jn","00:17"],["Bidhannagar Road","00:24"],["Sealdah","00:40"]],"k":"ks","n":"Krishnanagar – Sealdah Local","t":""},"31845":{"d":"Mon–Sat (not Sunday)","s":[["Sealdah","09:48"],["Bidhannagar Road","09:56"],["Dum Dum Jn","10:00"],["Belgharia","10:06"],["Sodpur","10:12"],["Khardaha","10:16"],["Barrackpore","10:22"],["Shyamnagar","10:31"],["Naihati Jn","10:51"],["Kanchrapara","10:59"],["Kalyani","11:05"],["Chakdaha","11:18"],["Ranaghat Jn","11:37"],["Krishnanagar City Jn","12:07"]],"k":"sk","n":"Sealdah – Krishnanagar AC Local","t":"AC"},"31846":{"d":"Mon–Sat (not Sunday)","s":[["Krishnanagar City Jn","13:30"],["Ranaghat Jn","13:55"],["Chakdaha","14:05"],["Kalyani","14:19"],["Kanchrapara","14:23"],["Naihati Jn","14:35"],["Shyamnagar","14:44"],["Barrackpore","14:54"],["Khardaha","15:01"],["Sodpur","15:06"],["Belgharia","15:13"],["Dum Dum Jn","15:19"],["Bidhannagar Road","15:24"],["Sealdah","15:40"]],"k":"ks","n":"Krishnanagar – Sealdah AC Local","t":"AC"},"31847":{"d":"Sundays only","s":[["Sealdah","11:55"],["Bidhannagar Road","12:03"],["Dum Dum Jn","12:08"],["Belgharia","12:14"],["Sodpur","12:20"],["Khardaha","12:25"],["Barrackpore","12:31"],["Shyamnagar","12:40"],["Naihati Jn","12:55"],["Kanchrapara","13:04"],["Kalyani","13:10"],["Chakdaha","13:25"],["Ranaghat Jn","13:43"],["Krishnanagar City Jn","14:11"]],"k":"sk","n":"Sealdah – Krishnanagar AC EMU Local","t":"AC"},"31848":{"d":"Sundays only","s":[["Krishnanagar City Jn","16:05"],["Ranaghat Jn","16:36"],["Chakdaha","16:46"],["Kalyani","17:04"],["Kanchrapara","17:08"],["Naihati Jn","17:18"],["Shyamnagar","17:27"],["Barrackpore","17:38"],["Khardaha","17:43"],["Sodpur","17:48"],["Belgharia","17:55"],["Dum Dum Jn","18:03"],["Bidhannagar Road","18:08"],["Sealdah","18:20"]],"k":"ks","n":"Krishnanagar – Sealdah AC EMU Local","t":"AC"},"37911":{"d":"Daily","s":[["Howrah Jn","05:22"],["Liluah","05:30"],["Belur","05:33"],["Bally","05:36"],["Uttarpara","05:39"],["Hind Motor","05:41"],["Konnagar","05:44"],["Rishra","05:47"],["Serampore","05:50"],["Sheoraphuli","05:54"],["Baidyabati","05:56"],["Bhadreshwar","06:00"],["Mankundu","06:02"],["Chandannagar","06:05"],["Chinsurah","06:08"],["Hooghly","06:15"],["Bandel","06:20"],["Bansberia","06:29"],["Tribeni","06:33"],["Kuntighat","06:36"],["Dumurdaha","06:40"],["Khamargachhi","06:43"],["Jirat","06:47"],["Balagarh","06:50"],["Somra Bazar","06:53"],["Behula","06:58"],["Guptipara","07:01"],["Ambika Kalna","07:07"],["Baghnapara","07:11"],["Dhatrigram","07:16"],["Samudragarh","07:23"],["Kalinagar","07:27"],["Nabadwip Dham","07:32"]],"k":"hn","n":"Howrah – Katwa Local","t":""},"37912":{"d":"Daily","s":[["Nabadwip Dham","04:26"],["Kalinagar","04:31"],["Samudragarh","04:35"],["Dhatrigram","04:41"],["Baghnapara","04:46"],["Ambika Kalna","04:50"],["Guptipara","04:56"],["Behula","04:59"],["Somra Bazar","05:04"],["Balagarh","05:08"],["Jirat","05:13"],["Khamargachhi","05:18"],["Dumurdaha","05:21"],["Kuntighat","05:24"],["Tribeni","05:27"],["Islampara Halt","05:30"],["Bansberia","05:32"],["Bandel","05:47"],["Hooghly","05:52"],["Chinsurah","05:55"],["Chandannagar","05:58"],["Mankundu","06:01"],["Bhadreshwar","06:03"],["Baidyabati","06:07"],["Sheoraphuli","06:10"],["Serampore","06:13"],["Rishra","06:17"],["Konnagar","06:20"],["Hind Motor","06:22"],["Uttarpara","06:25"],["Bally","06:27"],["Belur","06:30"],["Liluah","06:33"],["Howrah Jn","06:57"]],"k":"nh","n":"Katwa – Howrah Local","t":""},"37913":{"d":"Daily","s":[["Howrah Jn","08:00"],["Liluah","08:08"],["Belur","08:11"],["Bally","08:14"],["Uttarpara","08:17"],["Hind Motor","08:19"],["Konnagar","08:22"],["Rishra","08:25"],["Serampore","08:28"],["Sheoraphuli","08:32"],["Baidyabati","08:34"],["Bhadreshwar","08:38"],["Mankundu","08:40"],["Chandannagar","08:43"],["Chinsurah","08:46"],["Hooghly","08:49"],["Bandel","08:58"],["Bansberia","09:07"],["Tribeni","09:11"],["Kuntighat","09:14"],["Dumurdaha","09:18"],["Khamargachhi","09:21"],["Jirat","09:25"],["Balagarh","09:28"],["Somra Bazar","09:31"],["Behula","09:36"],["Guptipara","09:39"],["Ambika Kalna","09:45"],["Baghnapara","09:49"],["Dhatrigram","09:54"],["Samudragarh","10:01"],["Kalinagar","10:05"],["Nabadwip Dham","10:10"]],"k":"hn","n":"Howrah – Katwa Local","t":""},"37914":{"d":"Daily","s":[["Nabadwip Dham","06:17"],["Kalinagar","06:23"],["Samudragarh","06:27"],["Dhatrigram","06:33"],["Baghnapara","06:38"],["Ambika Kalna","06:42"],["Guptipara","06:48"],["Behula","06:51"],["Somra Bazar","06:56"],["Balagarh","06:59"],["Jirat","07:04"],["Khamargachhi","07:09"],["Dumurdaha","07:12"],["Kuntighat","07:15"],["Tribeni","07:18"],["Islampara Halt","07:21"],["Bansberia","07:23"],["Bandel","07:47"],["Chinsurah","07:54"],["Chandannagar","07:58"],["Liluah","08:27"],["Howrah Jn","08:55"]],"k":"nh","n":"Katwa – Howrah Local","t":""},"37915":{"d":"Daily","s":[["Howrah Jn","10:00"],["Liluah","10:08"],["Belur","10:11"],["Bally","10:14"],["Uttarpara","10:17"],["Hind Motor","10:19"],["Konnagar","10:22"],["Rishra","10:26"],["Serampore","10:29"],["Sheoraphuli","10:33"],["Baidyabati","10:35"],["Bhadreshwar","10:39"],["Mankundu","10:41"],["Chandannagar","10:44"],["Chinsurah","10:47"],["Hooghly","10:50"],["Bandel","10:58"],["Bansberia","11:07"],["Islampara Halt","11:10"],["Tribeni","11:12"],["Kuntighat","11:16"],["Dumurdaha","11:19"],["Khamargachhi","11:22"],["Jirat","11:27"],["Balagarh","11:30"],["Somra Bazar","11:33"],["Behula","11:38"],["Guptipara","11:41"],["Ambika Kalna","11:47"],["Baghnapara","11:51"],["Dhatrigram","11:56"],["Samudragarh","12:03"],["Kalinagar","12:07"],["Nabadwip Dham","12:12"]],"k":"hn","n":"Howrah – Katwa Local","t":""},"37916":{"d":"Daily","s":[["Nabadwip Dham","07:05"],["Kalinagar","07:11"],["Samudragarh","07:15"],["Nandaigram Halt","07:18"],["Dhatrigram","07:22"],["Baghnapara","07:26"],["Ambika Kalna","07:30"],["Guptipara","07:36"],["Behula","07:39"],["Somra Bazar","07:44"],["Balagarh","07:47"],["Jirat","07:51"],["Khamargachhi","07:57"],["Dumurdaha","07:59"],["Kuntighat","08:02"],["Tribeni","08:06"],["Islampara Halt","08:08"],["Bansberia","08:11"],["Bandel","08:28"],["Chinsurah","08:34"],["Chandannagar","08:38"],["Howrah Jn","09:30"]],"k":"nh","n":"Katwa – Howrah Local","t":""},"37917":{"d":"Daily","s":[["Howrah Jn","12:10"],["Liluah","12:18"],["Belur","12:21"],["Bally","12:24"],["Uttarpara","12:27"],["Hind Motor","12:29"],["Konnagar","12:32"],["Rishra","12:35"],["Serampore","12:38"],["Sheoraphuli","12:42"],["Baidyabati","12:44"],["Bhadreshwar","12:48"],["Mankundu","12:50"],["Chandannagar","12:53"],["Chinsurah","12:56"],["Hooghly","12:59"],["Bandel","13:11"],["Bansberia","13:20"],["Tribeni","13:24"],["Kuntighat","13:27"],["Dumurdaha","13:30"],["Khamargachhi","13:33"],["Jirat","13:37"],["Balagarh","13:40"],["Somra Bazar","13:43"],["Behula","13:48"],["Guptipara","13:51"],["Ambika Kalna","13:57"],["Baghnapara","14:01"],["Dhatrigram","14:06"],["Samudragarh","14:13"],["Kalinagar","14:17"],["Nabadwip Dham","14:22"]],"k":"hn","n":"Howrah – Katwa Local","t":""},"37918":{"d":"Daily","s":[["Nabadwip Dham","07:39"],["Kalinagar","07:45"],["Samudragarh","07:49"],["Nandaigram Halt","07:52"],["Dhatrigram","07:56"],["Baghnapara","08:00"],["Ambika Kalna","08:05"],["Guptipara","08:11"],["Behula","08:14"],["Somra Bazar","08:19"],["Balagarh","08:22"],["Jirat","08:26"],["Khamargachhi","08:32"],["Dumurdaha","08:34"],["Kuntighat","08:37"],["Tribeni","08:41"],["Bansberia","08:46"],["Bandel","09:03"],["Hooghly","09:16"],["Chinsurah","09:19"],["Chandannagar","09:22"],["Mankundu","09:25"],["Bhadreshwar","09:28"],["Baidyabati","09:31"],["Sheoraphuli","09:34"],["Serampore","09:37"],["Rishra","09:41"],["Konnagar","09:45"],["Hind Motor","09:47"],["Uttarpara","09:50"],["Bally","09:52"],["Belur","09:55"],["Liluah","09:59"],["Howrah Jn","10:18"]],"k":"nh","n":"Katwa – Howrah Local","t":""},"37919":{"d":"Daily","s":[["Howrah Jn","14:30"],["Serampore","14:51"],["Sheoraphuli","14:55"],["Chandannagar","15:03"],["Chinsurah","15:06"],["Bandel","15:23"],["Bansberia","15:32"],["Tribeni","15:36"],["Kuntighat","15:39"],["Dumurdaha","15:43"],["Khamargachhi","15:46"],["Jirat","15:50"],["Balagarh","15:53"],["Somra Bazar","15:56"],["Behula","16:01"],["Guptipara","16:04"],["Ambika Kalna","16:10"],["Baghnapara","16:14"],["Dhatrigram","16:19"],["Samudragarh","16:26"],["Kalinagar","16:30"],["Nabadwip Dham","16:35"]],"k":"hn","n":"Howrah – Katwa Local","t":""},"37920":{"d":"Daily","s":[["Nabadwip Dham","08:28"],["Kalinagar","08:34"],["Samudragarh","08:38"],["Dhatrigram","08:44"],["Baghnapara","08:49"],["Ambika Kalna","08:53"],["Guptipara","08:59"],["Behula","09:02"],["Somra Bazar","09:07"],["Balagarh","09:10"],["Jirat","09:15"],["Khamargachhi","09:20"],["Dumurdaha","09:23"],["Kuntighat","09:26"],["Tribeni","09:29"],["Islampara Halt","09:32"],["Bansberia","09:34"],["Bandel","09:56"],["Chinsurah","10:03"],["Chandannagar","10:07"],["Howrah Jn","10:55"]],"k":"nh","n":"Katwa – Howrah Local","t":""},"37921":{"d":"Daily","s":[["Howrah Jn","17:05"],["Liluah","17:13"],["Bally","17:18"],["Konnagar","17:26"],["Serampore","17:33"],["Sheoraphuli","17:37"],["Baidyabati","17:39"],["Bhadreshwar","17:43"],["Mankundu","17:45"],["Chandannagar","17:48"],["Chinsurah","17:53"],["Hooghly","17:56"],["Bandel","18:05"],["Bansberia","18:14"],["Islampara Halt","18:17"],["Tribeni","18:19"],["Kuntighat","18:23"],["Dumurdaha","18:26"],["Khamargachhi","18:29"],["Jirat","18:34"],["Balagarh","18:37"],["Somra Bazar","18:40"],["Behula","18:45"],["Guptipara","18:48"],["Ambika Kalna","18:54"],["Baghnapara","18:58"],["Dhatrigram","19:03"],["Nandaigram Halt","19:07"],["Samudragarh","19:11"],["Kalinagar","19:15"],["Nabadwip Dham","19:20"]],"k":"hn","n":"Howrah – Katwa Local","t":""},"37922":{"d":"Daily","s":[["Nabadwip Dham","11:36"],["Kalinagar","11:42"],["Samudragarh","11:46"],["Dhatrigram","11:53"],["Baghnapara","11:58"],["Ambika Kalna","12:03"],["Guptipara","12:09"],["Behula","12:13"],["Somra Bazar","12:19"],["Balagarh","12:23"],["Jirat","12:28"],["Khamargachhi","12:34"],["Dumurdaha","12:38"],["Kuntighat","12:42"],["Tribeni","12:47"],["Bansberia","12:52"],["Bandel","13:02"],["Hooghly","13:07"],["Chinsurah","13:10"],["Chandannagar","13:13"],["Mankundu","13:16"],["Bhadreshwar","13:19"],["Baidyabati","13:22"],["Sheoraphuli","13:25"],["Serampore","13:28"],["Rishra","13:32"],["Konnagar","13:36"],["Hind Motor","13:38"],["Uttarpara","13:41"],["Bally","13:43"],["Belur","13:46"],["Liluah","13:50"],["Howrah Jn","14:22"]],"k":"nh","n":"Katwa – Howrah Local","t":""},"37923":{"d":"Daily","s":[["Howrah Jn","18:00"],["Liluah","18:09"],["Serampore","18:22"],["Chandannagar","18:32"],["Chinsurah","18:36"],["Bandel","18:51"],["Bansberia","19:00"],["Islampara Halt","19:03"],["Tribeni","19:05"],["Kuntighat","19:08"],["Dumurdaha","19:12"],["Khamargachhi","19:15"],["Jirat","19:19"],["Balagarh","19:22"],["Somra Bazar","19:25"],["Behula","19:30"],["Guptipara","19:33"],["Ambika Kalna","19:39"],["Baghnapara","19:43"],["Dhatrigram","19:48"],["Nandaigram Halt","19:52"],["Samudragarh","19:56"],["Kalinagar","20:00"],["Nabadwip Dham","20:05"]],"k":"hn","n":"Howrah – Katwa Local","t":""},"37924":{"d":"Daily","s":[["Nabadwip Dham","15:29"],["Kalinagar","15:35"],["Samudragarh","15:39"],["Dhatrigram","15:45"],["Baghnapara","15:50"],["Ambika Kalna","15:54"],["Guptipara","16:00"],["Behula","16:03"],["Somra Bazar","16:08"],["Balagarh","16:11"],["Jirat","16:16"],["Khamargachhi","16:21"],["Dumurdaha","16:24"],["Kuntighat","16:27"],["Tribeni","16:30"],["Islampara Halt","16:33"],["Bansberia","16:35"],["Bandel","17:02"],["Sheoraphuli","17:21"],["Howrah Jn","18:00"]],"k":"nh","n":"Katwa – Howrah Local","t":""},"37925":{"d":"Daily","s":[["Howrah Jn","19:25"],["Chandannagar","19:56"],["Chinsurah","20:00"],["Bandel","20:15"],["Bansberia","20:24"],["Islampara Halt","20:27"],["Tribeni","20:29"],["Kuntighat","20:33"],["Dumurdaha","20:36"],["Khamargachhi","20:39"],["Jirat","20:44"],["Balagarh","20:47"],["Somra Bazar","20:50"],["Behula","20:55"],["Guptipara","20:58"],["Ambika Kalna","21:04"],["Baghnapara","21:08"],["Dhatrigram","21:13"],["Samudragarh","21:20"],["Kalinagar","21:24"],["Nabadwip Dham","21:29"]],"k":"hn","n":"Howrah – Katwa Local","t":""},"37926":{"d":"Daily","s":[["Nabadwip Dham","16:14"],["Kalinagar","16:20"],["Samudragarh","16:24"],["Nandaigram Halt","16:27"],["Dhatrigram","16:31"],["Baghnapara","16:35"],["Ambika Kalna","16:40"],["Guptipara","16:46"],["Behula","16:49"],["Somra Bazar","16:54"],["Balagarh","16:57"],["Jirat","17:01"],["Khamargachhi","17:07"],["Dumurdaha","17:09"],["Kuntighat","17:12"],["Tribeni","17:16"],["Bansberia","17:21"],["Bandel","17:41"],["Hooghly","17:46"],["Chinsurah","17:49"],["Chandannagar","17:52"],["Mankundu","17:55"],["Bhadreshwar","17:58"],["Baidyabati","18:01"],["Sheoraphuli","18:04"],["Serampore","18:07"],["Rishra","18:11"],["Konnagar","18:14"],["Hind Motor","18:17"],["Uttarpara","18:20"],["Bally","18:22"],["Belur","18:25"],["Liluah","18:28"],["Howrah Jn","18:45"]],"k":"nh","n":"Katwa – Howrah Local","t":""},"37927":{"d":"Daily","s":[["Howrah Jn","20:30"],["Liluah","20:38"],["Belur","20:41"],["Bally","20:44"],["Uttarpara","20:47"],["Hind Motor","20:49"],["Konnagar","20:52"],["Rishra","20:55"],["Serampore","21:02"],["Sheoraphuli","21:06"],["Baidyabati","21:08"],["Bhadreshwar","21:12"],["Mankundu","21:14"],["Chandannagar","21:17"],["Chinsurah","21:20"],["Hooghly","21:23"],["Bandel","21:35"],["Bansberia","21:44"],["Islampara Halt","21:47"],["Tribeni","21:49"],["Kuntighat","21:52"],["Dumurdaha","21:56"],["Khamargachhi","21:59"],["Jirat","22:03"],["Balagarh","22:06"],["Somra Bazar","22:10"],["Behula","22:14"],["Guptipara","22:17"],["Ambika Kalna","22:23"],["Baghnapara","22:27"],["Dhatrigram","22:32"],["Samudragarh","22:39"],["Kalinagar","22:43"],["Nabadwip Dham","23:02"]],"k":"hn","n":"Howrah – Katwa Local","t":""},"37928":{"d":"Daily","s":[["Nabadwip Dham","20:08"],["Kalinagar","20:13"],["Samudragarh","20:17"],["Dhatrigram","20:23"],["Baghnapara","20:28"],["Ambika Kalna","20:32"],["Guptipara","20:38"],["Behula","20:41"],["Somra Bazar","20:46"],["Balagarh","20:49"],["Jirat","20:54"],["Khamargachhi","20:59"],["Dumurdaha","21:02"],["Kuntighat","21:05"],["Tribeni","21:07"],["Islampara Halt","21:10"],["Bansberia","21:26"],["Bandel","21:34"],["Hooghly","21:39"],["Chinsurah","21:42"],["Chandannagar","21:45"],["Mankundu","21:48"],["Bhadreshwar","21:51"],["Baidyabati","21:54"],["Sheoraphuli","21:59"],["Serampore","22:02"],["Rishra","22:06"],["Konnagar","22:11"],["Hind Motor","22:13"],["Uttarpara","22:16"],["Bally","22:18"],["Belur","22:21"],["Liluah","22:25"],["Howrah Jn","22:44"]],"k":"nh","n":"Katwa – Howrah Local","t":""},"63103":{"d":"Daily","s":[["Sealdah","19:15"],["Bidhannagar Road","19:22"],["Dum Dum Jn","19:26"],["Sodpur","19:35"],["Barrackpore","19:46"],["Naihati Jn","20:11"],["Kanchrapara","20:21"],["Kalyani","20:25"],["Chakdaha","20:43"],["Ranaghat Jn","21:03"],["Kalinarayanpur Jn","21:09"],["Krishnanagar City Jn","21:30"]],"k":"sk","n":"Sealdah – Lalgola MEMU","t":"MEMU"},"63104":{"d":"Daily","s":[["Krishnanagar City Jn","13:48"],["Jalalkhali Halt","13:53"],["Badkulla","13:58"],["Taherpur","14:03"],["Birnagar","14:06"],["Kalinarayanpur Jn","14:10"],["Ranaghat Jn","14:23"],["Payradanga","14:28"],["Chakdaha","14:33"],["Palpara","14:36"],["Simurali","14:39"],["Madanpur","14:43"],["Kalyani","14:48"],["Kanchrapara","14:51"],["Halisahar","14:59"],["Naihati Jn","15:04"],["Barrackpore","15:23"],["Dum Dum Jn","15:40"],["Bidhannagar Road","15:44"],["Sealdah","16:00"]],"k":"ks","n":"Lalgola – Sealdah MEMU","t":"MEMU"},"63106":{"d":"Daily","s":[["Krishnanagar City Jn","21:09"],["Ranaghat Jn","21:45"],["Chakdaha","21:55"],["Kalyani","22:09"],["Kanchrapara","22:12"],["Naihati Jn","22:29"],["Barrackpore","22:45"],["Dum Dum Jn","23:02"],["Sealdah","23:25"]],"k":"ks","n":"Lalgola – Sealdah MEMU","t":"MEMU"},"63107":{"d":"Daily","s":[["Sealdah","10:28"],["Dum Dum Jn","10:40"],["Barrackpore","10:55"],["Naihati Jn","11:21"],["Kanchrapara","11:29"],["Kalyani","11:34"],["Chakdaha","11:45"],["Ranaghat Jn","12:08"],["Krishnanagar City Jn","12:35"]],"k":"sk","n":"Sealdah – Lalgola MEMU","t":"MEMU"}};
(function(){
  var dlg=document.getElementById('trDlg'); if(!dlg) return;
  var LAST={sk:'From Krishnanagar it is about 40 minutes by bus, auto or car to Mayapur and Nikadi.',ks:'From Mayapur, Krishnanagar station is about 40 minutes by bus, auto or car.',hn:'From Nabadwip Dham take a toto to the ghat and the ferry across the Ganga to Mayapur.',nh:'From Mayapur, cross the Ganga by ferry to Nabadwip and take a toto to Nabadwip Dham station.'};
  function t12(t){var a=t.split(':'),h=+a[0];return (h%12||12)+':'+a[1]+(h<12?' AM':' PM');}
  function mins(t){var a=t.split(':');return +a[0]*60+(+a[1]);}
  var last=null;
  function open(li){
    last=document.activeElement;
    var n=li.getAttribute('data-n'),T=window.NK_TRAINS[n]; if(!T) return;
    var st=T.s,dep=st[0][1],arr=st[st.length-1][1],d=mins(arr)-mins(dep); if(d<0)d+=1440;
    document.getElementById('trK').textContent=(T.t==='AC'?'AC local train':T.t==='EXP'?'Express train':T.t==='MEMU'?'MEMU train':'Local train')+' · No. '+n;
    document.getElementById('trT').textContent=T.n;
    document.getElementById('trTime').innerHTML='<b>'+t12(dep)+'</b> → <b>'+t12(arr)+'</b>'+(T.t==='AC'?' <span class="ac">AC</span>':'');
    document.getElementById('trSub').textContent=st[0][0]+' → '+st[st.length-1][0]+' · '+Math.floor(d/60)+' h '+(d%60)+' min · '+st.length+' stops · Runs: '+T.d;
    document.getElementById('trRoute').innerHTML=st.map(function(x,i){return '<li class="'+(i===0||i===st.length-1?'end':'')+'"><b>'+x[0]+'</b><span>'+t12(x[1])+'</span></li>';}).join('');
    document.getElementById('trNote').textContent=LAST[T.k]+' Times from the official Indian Railways timetable (NTES / RailOne).';
    document.getElementById('trFull').href='https://www.ixigo.com/trains/'+n;
    dlg.hidden=false; document.documentElement.style.overflow='hidden'; dlg.querySelector('.trd-x').focus();
  }
  function close(){dlg.hidden=true;document.documentElement.style.overflow='';if(last&&last.focus)last.focus();}
  document.addEventListener('click',function(e){var b=e.target.closest('.trb');if(b){open(b.closest('li'));}});
  dlg.addEventListener('click',function(e){if(e.target===dlg||e.target.closest('.trd-x'))close();});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!dlg.hidden)close();});
})();

}catch(e){console.error("[nikadi part 15]",e);}
/* part 16 */
try{

(function(){var f=document.getElementById('gtForm');if(!f)return;
try{f.elements.dt.min=new Date(Date.now()+330*60000).toISOString().slice(0,10);}catch(e){}
f.addEventListener('submit',function(e){e.preventDefault();var x=f.elements,L=['Hare Krishna! Travel booking request for Nikadi × Gourdham Travels','Name: '+x.nm.value.trim(),'Book: '+x.w.value];
if(x.fr.value.trim())L.push('From: '+x.fr.value.trim());if(x.to.value.trim())L.push('To: '+x.to.value.trim());if(x.dt.value)L.push('Date: '+x.dt.value);L.push('Travellers: '+x.px.value);if(x.m.value.trim())L.push(x.m.value.trim());
window.open('https://wa.me/919933864574?text='+encodeURIComponent(L.join('\n')),'_blank','noopener');});})();

}catch(e){console.error("[nikadi part 16]",e);}
/* part 17 */
try{

(function(){var v=document.getElementById('mvidV'),b=document.getElementById('mvidS');if(!v||!b)return;
v.muted=true;
function play(){var p=v.play();if(p&&p.catch)p.catch(function(){});}
if('IntersectionObserver' in window){new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting&&e.intersectionRatio>.35)play();else v.pause();});},{threshold:[0,.35,.6]}).observe(v);}else play();
document.addEventListener('visibilitychange',function(){if(document.hidden)v.pause();});
b.addEventListener('click',function(){var on=v.muted;v.muted=!on;if(on){v.volume=1;play();}b.setAttribute('aria-pressed',on?'true':'false');b.setAttribute('aria-label',on?'Turn sound off':'Turn sound on');b.querySelector('span').textContent=on?'Sound off':'Sound on';});
})();

}catch(e){console.error("[nikadi part 17]",e);}
/* part 18 */
try{

(function(){var row=document.getElementById('meetIg'),nav=document.getElementById('meetNav');if(!row||!nav)return;
var items=[].slice.call(row.children),dots=[].slice.call(nav.querySelectorAll('.mnav-dots button')),cur=0;
function go(i){i=Math.max(0,Math.min(items.length-1,i));var it=items[i];var left=it.offsetLeft-row.offsetLeft-(row.clientWidth-it.offsetWidth)/2;
  if(row.clientWidth>=row.scrollWidth-4)return;row.scrollTo({left:Math.max(0,left),behavior:'smooth'});}
function mark(){var mid=row.scrollLeft+row.clientWidth/2,best=0,bd=1e9;items.forEach(function(it,i){var c=it.offsetLeft-row.offsetLeft+it.offsetWidth/2,d=Math.abs(c-mid);if(d<bd){bd=d;best=i;}});
  cur=best;dots.forEach(function(d,i){d.classList.toggle('on',i===cur);});}
nav.addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;if(b.dataset.d)go(cur+ +b.dataset.d);else go(+b.dataset.i);});
var t;row.addEventListener('scroll',function(){clearTimeout(t);t=setTimeout(mark,60);},{passive:true});
window.addEventListener('resize',mark);mark();
})();

}catch(e){console.error("[nikadi part 18]",e);}
/* part 19 */
try{

/* phones: Instagram's frames swallow sideways swipes, so a clear layer on top lets the row scroll; a tap still opens the post */
(function(){var row=document.getElementById('meetIg');if(!row)return;
row.querySelectorAll('.igc').forEach(function(c){var q=c.querySelector('[data-instgrm-permalink]'),f=c.querySelector('iframe'),h=q?q.getAttribute('data-instgrm-permalink'):f?f.src.replace(/embed.*$/,''):'';if(!h)return;var t=document.createElement('a');t.className='igc-tap';t.href=h.split('?')[0];t.target='_blank';t.rel='noopener';t.setAttribute('aria-label','Open this post on Instagram');c.appendChild(t);});
})();

}catch(e){console.error("[nikadi part 19]",e);}
/* part 20 */
try{

/* ---- v6: live availability calendar (free / few / full from the front desk, prices from pricing.js) ---- */
(function(){
  var box=document.getElementById('avc');if(!box)return;
  var API="https://ebwdrqdsexjterbxyeoa.supabase.co/functions/v1/api",R=window.NikadiRates;
  function $(id){return document.getElementById(id);}
  function pad(n){return (n<10?'0':'')+n;}
  function ymd(y,m,d){var x=new Date(Date.UTC(y,m,d));return x.getUTCFullYear()+'-'+pad(x.getUTCMonth()+1)+'-'+pad(x.getUTCDate());}
  function addDay(s,n){var p=s.split('-');return ymd(+p[0],+p[1]-1,+p[2]+n);}
  var MN=['January','February','March','April','May','June','July','August','September','October','November','December'],WD=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  var today=R?R.today():new Date(Date.now()+330*60000).toISOString().slice(0,10);
  var ty=+today.slice(0,4),tm=+today.slice(5,7)-1,off=0,MAXOFF=5,type='Deluxe Double',AV=null,ci=null,co=null,state='loading';
  function stat(d){
    if(!AV)return '';var row=AV[d];if(!row)return '';
    var re=type==='Large Twin'?/large/i:type==='Deluxe Twin'?/^(?!.*large).*twin/i:/double/i,best='';
    Object.keys(row).forEach(function(k){if(!re.test(k))return;var v=row[k];if(v==='free'||(v==='few'&&best!=='free')||(v==='full'&&!best))best=v;});
    return best;
  }
  function price(d){if(!R)return '';var r=R.rate(type,d);return '₹'+r.toLocaleString('en-IN');}
  function fullBetween(a,b){for(var d=a;d<b;d=addDay(d,1))if(stat(d)==='full')return d;return null;}
  function nice(d){var p=d.split('-'),x=new Date(Date.UTC(+p[0],+p[1]-1,+p[2]));return WD[x.getUTCDay()]+' '+(+p[2])+' '+MN[+p[1]-1].slice(0,3);}
  function month(y,m){
    var first=new Date(Date.UTC(y,m,1)).getUTCDay(),days=new Date(Date.UTC(y,m+1,0)).getUTCDate(),h='<div class="avm"><h4>'+MN[m]+' '+y+'</h4><div class="avm-g">';
    WD.forEach(function(w){h+='<span class="wd">'+w.slice(0,2)+'</span>';});
    for(var i=0;i<first;i++)h+='<span class="avd a-blank"></span>';
    for(var d=1;d<=days;d++){
      var k=ymd(y,m,d),c=['avd'],st=stat(k),lbl=price(k),past=k<today;
      if(past)c.push('a-past');else{if(st)c.push('a-'+st);if(st==='few')lbl='Few left';if(st==='full')lbl='Sold out';if(R&&R.period(k).offer)c.push('a-offer');}
      if(k===today)c.push('a-today');
      if(ci&&(k===ci||k===co))c.push('a-sel');else if(ci&&co&&k>ci&&k<co)c.push('a-in');
      h+='<button type="button" class="'+c.join(' ')+'" data-d="'+k+'"'+(past?' disabled':'')+' aria-label="'+nice(k)+(st?', '+(st==='free'?'available':st==='few'?'only a few rooms left':'sold out'):'')+'"><b>'+d+'</b><small>'+(past?'&nbsp;':lbl)+'</small><i></i></button>';
    }
    return h+'</div></div>';
  }
  function draw(){
    var y=ty,m=tm+off;y+=Math.floor(m/12);m=((m%12)+12)%12;var y2=y,m2=m+1;if(m2>11){m2=0;y2++;}
    $('avcMonths').innerHTML=month(y,m)+month(y2,m2);
    $('avcPrev').disabled=off<=0;$('avcNext').disabled=off>=MAXOFF;
    box.classList.toggle('offline',!AV);
    var sel=$('avcSel');
    if(!ci)sel.textContent='Pick your check-in date.';
    else if(!co)sel.innerHTML='Check-in <b>'+nice(ci)+'</b>. Now pick your check-out date.';
    else{var n=0;for(var d=ci;d<co;d=addDay(d,1))n++;var q=R?R.quote(type,ci,co,1,0):null;sel.innerHTML='<b>'+nice(ci)+'</b> to <b>'+nice(co)+'</b> · '+n+' night'+(n>1?'s':'')+(q&&q.total?' · <b>₹'+q.total.toLocaleString('en-IN')+'</b> for one '+type+' room':'');}
    $('avcBook').hidden=!(ci&&co);$('avcClear').hidden=!ci;
  }
  box.addEventListener('click',function(e){
    var t=e.target.closest('[data-avt]');
    if(t){type=t.getAttribute('data-avt');[].forEach.call(box.querySelectorAll('[data-avt]'),function(b){b.setAttribute('aria-selected',b===t?'true':'false');});
      if(ci&&co&&fullBetween(ci,co)){co=null;}draw();return;}
    var b=e.target.closest('.avd');if(!b||b.disabled)return;
    var d=b.getAttribute('data-d'),st=stat(d);
    if(!ci||co||d<=ci){if(st==='full'){$('avcSel').textContent='That night is sold out for the '+type+'. Try the other room type, or another date.';return;}ci=d;co=null;}
    else{var f=fullBetween(ci,d);if(f){$('avcSel').textContent='The night of '+nice(f)+' is sold out, so those dates are not free together. Pick an earlier check-out, or another check-in.';return;}co=d;}
    draw();
  });
  $('avcPrev').addEventListener('click',function(){if(off>0){off--;draw();}});
  $('avcNext').addEventListener('click',function(){if(off<MAXOFF){off++;draw();}});
  $('avcClear').addEventListener('click',function(){ci=co=null;draw();});
  /* fill the booking bar, then the normal Book handler scrolls to it */
  $('avcBook').setAttribute('data-focus-book','');
  $('avcBook').addEventListener('click',function(){
    var a=$('ci'),b=$('co'),r=$('rm');if(!a||!b)return;
    a.value=ci;b.value=co;if(r)r.selectedIndex=type==='Large Twin'?2:type==='Deluxe Twin'?1:0;
    [a,b,r].forEach(function(el){if(!el)return;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));});
  });
  function load(){
    var cached=null;try{cached=JSON.parse(sessionStorage.getItem('nk_av')||'null');}catch(e){}
    if(cached&&Date.now()-cached.at<4*60000&&cached.from===today){AV=cached.map;draw();return;}
    fetch(API,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'deskSiteAvailability',days:180})})
    .then(function(r){return r.json();}).then(function(j){
      if(!j||!j.ok||!j.days)throw 0;
      var map={};j.days.forEach(function(x){map[x.d]=x.t;});AV=map;
      try{sessionStorage.setItem('nk_av',JSON.stringify({at:Date.now(),from:today,map:map}));}catch(e){}
      $('avcNote').textContent='Live from our front desk, updated every few minutes. Your booking is confirmed once we reply on WhatsApp.';
      draw();
    }).catch(function(){if(!AV){$('avcNote').textContent='Prices shown for each night. Send us your dates and we will confirm free rooms within minutes on WhatsApp.';draw();}});
  }
  draw();
  if('IntersectionObserver' in window){var io=new IntersectionObserver(function(es){if(es.some(function(x){return x.isIntersecting;})){io.disconnect();load();setInterval(function(){if(!document.hidden)load();},5*60000);}},{rootMargin:'400px 0px'});io.observe(box);}else load();
})();

}catch(e){console.error("[nikadi part 20]",e);}
/* part 21 */
try{

/* ---- v7: festival calendar countdown, staff wall and guest wall (from /data/*.json) ---- */
(function(){
  function $(id){return document.getElementById(id);}
  var MN=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],WD=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  var today=new Date(Date.now()+330*60000).toISOString().slice(0,10);
  function dn(a,b){var p=a.split('-'),q=b.split('-');return Math.round((Date.UTC(+q[0],+q[1]-1,+q[2])-Date.UTC(+p[0],+p[1]-1,+p[2]))/864e5);}
  var list=$('fvList');
  if(list){
    var next=null;
    [].forEach.call(list.querySelectorAll('.fv'),function(li){
      var d=li.getAttribute('data-d'),p=d.split('-'),x=new Date(Date.UTC(+p[0],+p[1]-1,+p[2]));
      li.querySelector('time').innerHTML='<span>'+MN[+p[1]-1]+'</span><b>'+(+p[2])+'</b><small>'+WD[x.getUTCDay()]+' '+p[0]+'</small>';
      if(d<today)li.classList.add('gone');else if(!next)next=li;
    });
    if(next){
      var n=dn(today,next.getAttribute('data-d')),box=$('fvNext'),p=next.getAttribute('data-d').split('-');
      var wa='https://wa.me/917501101137?text='+encodeURIComponent('Hare Krishna! I would like to book a room at Nikadi Guest House for '+next.querySelector('h3').textContent+'.');
      box.innerHTML='<div class="cd">'+(n===0?'Today':n)+'<small>'+(n===0?'Happening now':n===1?'day to go':'days to go')+'</small></div><div><p class="kicker">Next festival · '+(+p[2])+' '+MN[+p[1]-1]+' '+p[0]+'</p><h3>'+next.querySelector('h3').textContent+'</h3><p>'+next.querySelector('p').textContent+'</p></div><a class="btn btn-gold" href="'+wa+'" target="_blank" rel="noopener">Book for this festival</a>';
      box.hidden=false;
    }
  }
  function esc(t){return String(t==null?'':t).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function load(url,cb){fetch(url,{cache:'no-cache'}).then(function(r){if(!r.ok)throw 0;return r.json();}).then(cb).catch(function(){});}
  if($('staffGrid'))load('/data/team.json',function(a){
    a=(a||[]).filter(function(x){return x&&x.name&&x.photo&&x.show!==false;});if(!a.length)return;
    $('staffGrid').innerHTML=a.map(function(x){
      var src=esc(x.photo),webp=/\.jpe?g$/i.test(x.photo)?esc(x.photo.replace(/\.jpe?g$/i,'.webp')):'';
      return '<figure class="staff"><div class="ph"><picture>'+(webp?'<source srcset="'+webp+'" type="image/webp">':'')+'<img src="'+src+'" alt="'+esc(x.name)+', '+esc(x.role||'Nikadi team')+'" loading="lazy" decoding="async"></picture></div><figcaption><b>'+esc(x.name)+'</b><span>'+esc(x.role||'')+'</span>'+(x.id?'<span class="eid">ID '+esc(x.id)+'</span>':'')+'</figcaption></figure>';
    }).join('');
    $('team').hidden=false;
  });
  if($('guestWall'))load('/data/guests.json',function(a){
    a=(a||[]).filter(function(x){return x&&x.photo;});if(!a.length)return;
    $('guestWall').innerHTML=a.map(function(x){return '<figure><img src="'+esc(x.photo)+'" alt="'+esc(x.caption||'Guests at Nikadi Guest House')+'" loading="lazy" decoding="async">'+(x.name||x.caption?'<figcaption>'+(x.name?'<b>'+esc(x.name)+'</b> · ':'')+esc(x.caption||'')+'</figcaption>':'')+'</figure>';}).join('');
    $('guests').hidden=false;
  });
})();

}catch(e){console.error("[nikadi part 21]",e);}
/* part 22 */
try{

/* ---- page banner: gentle room photo slideshow ---- */
(function(){var s=document.querySelector('.pg-show');if(!s)return;var im=[].slice.call(s.querySelectorAll('img')),i=0;if(im.length<2)return;
if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
setInterval(function(){if(document.hidden)return;im[i].classList.remove('on');i=(i+1)%im.length;im[i].classList.add('on');},4500);})();

}catch(e){console.error("[nikadi part 22]",e);}