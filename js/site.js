/* part 0 */
try{
(function(){var b=document.getElementById('galMore');if(b)b.addEventListener('click',function(){var g=document.querySelector('.gal');g.classList.add('all');});})();
}catch(e){console.error("[nikadi part 0]",e);}
/* part 1 */
try{

/* ---- sky & weather moments: tap Sunrise and sunset for dawn or dusk light, Weather for thunder or rain;
   from 11 PM to 3 AM (India time) the page shows the real night sky with tonight's moon. Preview: ?fx=dusk|dawn|thunder|rain|night ---- */
(function(){
  var RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
  function ist(){return new Date(Date.now()+330*60000);}
  var fx=document.createElement('div');fx.id='fx';fx.setAttribute('aria-hidden','true');document.body.appendChild(fx);
  var busy=false;
  var SID=0,NODES=[];
  function done(ms,id){setTimeout(function(){if(id!==undefined&&id!==SID)return;fx.classList.remove('fx-on');setTimeout(function(){if(id!==undefined&&id!==SID)return;fx.className='';fx.innerHTML='';busy=false;},1700);},ms);}
  function hush(){NODES.forEach(function(n){try{n.stop();}catch(e){}});NODES=[];try{if(navigator.vibrate)navigator.vibrate(0);}catch(e){}}
  /* start a moment; if one is playing, fade it out softly first */
  function swap(run){var id=++SID;if(busy){hush();fx.classList.remove('fx-on');setTimeout(function(){if(id!==SID)return;fx.className='';fx.innerHTML='';busy=false;run(id);},520);}else run(id);}
  function seg(x,y,n,spread,step){var d='M'+x.toFixed(1)+' '+y.toFixed(1),pts=[];for(var i=0;i<n;i++){x+=(Math.random()-.5)*spread;y+=step*(.5+Math.random());d+=' L'+x.toFixed(1)+' '+y.toFixed(1);pts.push([x,y]);}return {d:d,pts:pts};}
  function bolt(){var x0=25+Math.random()*50,main=seg(x0,-2,26,3.2,2.4),paths=[main.d];
    for(var b=0;b<3;b++){var p=main.pts[4+Math.floor(Math.random()*14)];paths.push(seg(p[0],p[1],6+Math.floor(Math.random()*6),4,2).d);}
    var g=paths.map(function(d,i){var w=i?.12:.22;return '<path d="'+d+'" stroke="rgba(170,190,255,.35)" stroke-width="'+(w*6)+'"/><path d="'+d+'" stroke="#f4f7ff" stroke-width="'+w+'"/>';}).join('');
    return {x:x0,svg:'<svg class="fx-bolt" viewBox="0 0 100 100" preserveAspectRatio="none" style="width:100%;height:100%" fill="none" stroke-linejoin="round" stroke-linecap="round"><g style="filter:blur(.15px)">'+g+'</g></svg>'};}
  /* ---- sound (soft, made in the browser) and gentle vibration on phones that support it ---- */
  var AC=null,NB=null;
  function ac(){try{AC=AC||new (window.AudioContext||window.webkitAudioContext)();if(AC.state==='suspended')AC.resume();}catch(e){AC=null;}return AC;}
  function noise(a,sec,brown){var n=Math.floor(a.sampleRate*sec),b=a.createBuffer(1,n,a.sampleRate),d=b.getChannelData(0),l=0;for(var i=0;i<n;i++){var w=Math.random()*2-1;if(brown){l=(l+.02*w)/1.02;d[i]=l*3.5;}else d[i]=w;}return b;}
  function vib(p){try{if(navigator.vibrate)navigator.vibrate(p);}catch(e){}}
  function rainSound(sec,vol){var a=ac();if(!a)return;var t=a.currentTime,src=a.createBufferSource();src.buffer=noise(a,sec,false);
    var hp=a.createBiquadFilter();hp.type='highpass';hp.frequency.value=800;var lp=a.createBiquadFilter();lp.type='lowpass';lp.frequency.value=5200;var g=a.createGain();
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+.9);g.gain.setValueAtTime(vol,t+sec-1.4);g.gain.linearRampToValueAtTime(0,t+sec);
    src.connect(hp);hp.connect(lp);lp.connect(g);g.connect(a.destination);src.start(t);src.stop(t+sec);NODES.push(src);
    var tick=noise(a,.035,false);for(var i=0;i<sec*16;i++){var tt=t+.4+Math.random()*(sec-1),o=a.createBufferSource();o.buffer=tick;var bp=a.createBiquadFilter();bp.type='bandpass';bp.frequency.value=2200+Math.random()*4200;bp.Q.value=5;
      var gg=a.createGain();gg.gain.setValueAtTime(vol*(.4+Math.random()*.8),tt);gg.gain.exponentialRampToValueAtTime(.0001,tt+.035);o.connect(bp);bp.connect(gg);gg.connect(a.destination);o.start(tt);NODES.push(o);}}
  function thunderSound(at,big){var a=ac();if(!a)return;var t=a.currentTime+at;
    var cr=a.createBufferSource();cr.buffer=noise(a,.4,false);var ch=a.createBiquadFilter();ch.type='lowpass';ch.frequency.value=2400;var cg=a.createGain();cg.gain.setValueAtTime(0,t);cg.gain.linearRampToValueAtTime(.09*big,t+.02);cg.gain.exponentialRampToValueAtTime(.0001,t+.4);cr.connect(ch);ch.connect(cg);cg.connect(a.destination);cr.start(t);NODES.push(cr);
    var r=a.createBufferSource();r.buffer=noise(a,4.5,true);var lp=a.createBiquadFilter();lp.type='lowpass';lp.frequency.setValueAtTime(420,t);lp.frequency.exponentialRampToValueAtTime(110,t+4);
    var g=a.createGain(),N=60,cv=new Float32Array(N);for(var i=0;i<N;i++){var k=i/(N-1),env=k<.04?k/.04:Math.pow(1-k,1.6);cv[i]=Math.max(.0001,.32*big*env*(.55+.45*Math.random()));}
    g.gain.setValueAtTime(.0001,t);g.gain.setValueCurveAtTime(cv,t+.03,4.3);r.connect(lp);lp.connect(g);g.connect(a.destination);r.start(t);r.stop(t+4.5);NODES.push(r);}
  /* ---- clouds drawn as soft, lit puffs ---- */
  /* a realistic cloud deck: fractal noise, lit from above, thinning towards the bottom of the screen */
  function cloudLayer(W,H,cover,lit,shade,AMAX,DEP){AMAX=AMAX||.7;DEP=DEP||.4;var lw=360,lh=Math.max(60,Math.round(lw*H/W)),G=64,gr=[],i,j;for(i=0;i<(G+1)*(G+1);i++)gr.push(Math.random());
    function vn(x,y){x=((x%G)+G)%G;y=((y%G)+G)%G;var xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi,u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf);
      var a=gr[yi*(G+1)+xi],b=gr[yi*(G+1)+xi+1],c=gr[(yi+1)*(G+1)+xi],d=gr[(yi+1)*(G+1)+xi+1];return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;}
    function fbm(x,y){var t=0,amp=.55,f=1;for(var o=0;o<5;o++){var n=vn(x*f,y*f);t+=amp*(o<2?n:1-Math.abs(2*n-1));f*=2.1;amp*=.48;}return t;}
    function dens(x,y){var wx=fbm(x*.6+11,y*.6+3)*1.4,wy=fbm(x*.6+5,y*.6+17)*1.4;return fbm(x+wx,y*1.7+wy);}
    function ss(e0,e1,v){var t=Math.max(0,Math.min(1,(v-e0)/(e1-e0)));return t*t*(3-2*t);}
    var c=document.createElement('canvas');c.width=lw;c.height=lh;var x=c.getContext('2d'),im=x.createImageData(lw,lh),D=im.data,sc=3.6/lw,th=.78-cover*.42;
    for(j=0;j<lh;j++){var vy=j/lh,fade=Math.pow(Math.max(0,1-vy/DEP),1.3);if(!fade)continue;for(i=0;i<lw;i++){var X=i*sc,Y=j*sc,n=dens(X,Y),a=ss(th,th+.16,n)*fade*AMAX;if(a<.01)continue;
      var up=dens(X,Y-3*sc),lightUp=Math.max(0,Math.min(1,.5+(n-up)*5)),core=ss(th,th+.4,n),sh=Math.max(0,Math.min(1,.15+.55*core+.35*(1-lightUp)+vy*.5)),k=(j*lw+i)*4;
      D[k]=lit[0]+(shade[0]-lit[0])*sh;D[k+1]=lit[1]+(shade[1]-lit[1])*sh;D[k+2]=lit[2]+(shade[2]-lit[2])*sh;D[k+3]=255*a;}}
    x.putImageData(im,0,0);return c;}
  /* one scene engine for every moment: o = {sky,sun,clouds,tone,rain,dur,dawn,dusk} */
  function scene(o){swap(function(id){sceneRun(o,id);});}
  function sceneRun(o,id){busy=true;fx.className='fx-scene';fx.innerHTML='<canvas></canvas><div class="fx-flash"></div>';
    var c=fx.querySelector('canvas'),x=c.getContext('2d'),dpr=Math.min(2,window.devicePixelRatio||1),W=c.width=innerWidth*dpr,H=c.height=innerHeight*dpr;
    var T={bright:[[250,252,255],[196,208,228]],grey:[[214,219,228],[120,130,148]],dark:[[132,141,160],[34,40,56]]}[o.tone||'bright'];
    var deck=o.cover?cloudLayer(W,H,o.cover,T[0],T[1],{bright:.8,grey:.78,dark:.85}[o.tone||'bright'],{bright:.42,grey:.46,dark:.5}[o.tone||'bright']):null;
    var drops=[],spl=[];if(o.rain){var N=Math.round(innerWidth*(o.rain>1?.7:.45));for(var j=0;j<N;j++)drops.push({x:Math.random()*W,y:-Math.random()*H,l:(12+Math.random()*18)*dpr,v:(15+Math.random()*10)*dpr,a:.12+Math.random()*.26});}
    var t0=performance.now(),dur=o.dur||6500,last=t0;
    requestAnimationFrame(function(){fx.classList.add('fx-on');});
    (function frame(t){if(id!==SID)return;var k=(t-t0)/dur,dt=Math.min(50,t-last)/16.7;last=t;if(k>1){x.clearRect(0,0,W,H);return;}
      var fa=k<.14?k/.14:k>.8?(1-k)/.2:1;x.clearRect(0,0,W,H);x.globalAlpha=fa;
      var g=x.createLinearGradient(0,0,0,H);(o.sky||[]).forEach(function(q){g.addColorStop(q[0],q[1]);});if(o.sky){x.fillStyle=g;x.fillRect(0,0,W,H);}
      if(o.sun){var sx=o.sun.x*W,sy=(o.sun.y+.02*Math.sin(k*Math.PI))*H,sr=Math.min(W,H)*.055*(o.sun.big?1.15:1),M=Math.max(W,H);
        var wash=x.createLinearGradient(sx,sy,W*.1,H*.9);wash.addColorStop(0,'rgba(255,214,120,'+(o.sun.big?.32:.2)+')');wash.addColorStop(.55,'rgba(255,200,110,.06)');wash.addColorStop(1,'rgba(255,200,110,0)');x.fillStyle=wash;x.fillRect(0,0,W,H);
        var hg=x.createRadialGradient(sx,sy,0,sx,sy,M*.55);hg.addColorStop(0,'rgba(255,240,200,.7)');hg.addColorStop(.12,'rgba(255,214,130,.35)');hg.addColorStop(.4,'rgba(255,200,120,.1)');hg.addColorStop(1,'rgba(255,200,120,0)');x.fillStyle=hg;x.fillRect(0,0,W,H);
        var dg=x.createRadialGradient(sx,sy,0,sx,sy,sr*1.6);dg.addColorStop(0,'rgba(255,253,244,1)');dg.addColorStop(.55,'rgba(255,238,190,.98)');dg.addColorStop(.75,'rgba(255,214,130,.55)');dg.addColorStop(1,'rgba(255,200,110,0)');x.fillStyle=dg;x.beginPath();x.arc(sx,sy,sr*1.6,0,7);x.fill();}
      if(deck){if('filter' in x)x.filter='blur('+Math.round(1*dpr)+'px)';x.drawImage(deck,-W*.06+k*W*.05,-H*.02,W*1.12,H*1.02);if('filter' in x)x.filter='none';}
      if(o.sun){var ssx=o.sun.x*W,ssy=(o.sun.y+.02*Math.sin(k*Math.PI))*H,ssr=Math.min(W,H)*(o.sun.big?.07:.06);var cg=x.createRadialGradient(ssx,ssy,0,ssx,ssy,ssr*2.6);cg.addColorStop(0,'rgba(255,250,235,.95)');cg.addColorStop(.35,'rgba(255,236,180,.55)');cg.addColorStop(1,'rgba(255,220,150,0)');x.fillStyle=cg;x.beginPath();x.arc(ssx,ssy,ssr*2.6,0,7);x.fill();x.fillStyle='#fffbef';x.beginPath();x.arc(ssx,ssy,ssr,0,7);x.fill();x.strokeStyle='rgba(255,224,150,.8)';x.lineWidth=ssr*.12;x.stroke();}
      if(drops.length){x.lineCap='round';drops.forEach(function(d){x.strokeStyle='rgba(205,220,240,'+(d.a*fa).toFixed(3)+')';x.lineWidth=dpr*1.1;x.beginPath();x.moveTo(d.x,d.y);x.lineTo(d.x-d.l*.15,d.y+d.l);x.stroke();
          d.y+=d.v*dt;d.x-=d.v*.15*dt;if(d.y>H-4*dpr){if(Math.random()<.22)spl.push({x:d.x,y:H-3*dpr-Math.random()*H*.03,r:1,a:.28});d.y=-d.l-Math.random()*H*.2;d.x=Math.random()*W*1.1;}});
        spl=spl.filter(function(p){p.r+=1.2*dt;p.a-=.03*dt;if(p.a<=0)return false;x.strokeStyle='rgba(215,228,245,'+(p.a*fa).toFixed(3)+')';x.lineWidth=dpr;x.beginPath();x.ellipse(p.x,p.y,p.r*dpr,p.r*.35*dpr,0,0,7);x.stroke();return true;});}
      x.globalAlpha=1;if(!RM)requestAnimationFrame(frame);})(t0);
    if(o.storm){var f=fx.querySelector('.fx-flash');[600,2300,3900].forEach(function(at,i){var bo=bolt();setTimeout(function(){if(id!==SID)return;fx.style.setProperty('--fxx',bo.x+'%');var old=fx.querySelector('.fx-bolt');if(old)old.remove();fx.insertAdjacentHTML('beforeend',bo.svg);var b2=fx.querySelector('.fx-bolt');f.classList.remove('go');void f.offsetWidth;f.classList.add('go');b2.classList.add('go');},at);
        thunderSound(at/1000+.15+Math.random()*.25,i===1?1:.7);setTimeout(function(){if(id!==SID)return;vib(i===1?[90,40,220,70,160,60,110,90,70]:[60,50,140,80,80]);},at+150);});}
    if(o.rain){rainSound(dur/1000,o.rain>1?.06:.045);var pat=[],tt=0;while(tt<dur-800){var on=6+Math.round(Math.random()*8),off=50+Math.round(Math.random()*160);pat.push(on,off);tt+=on+off;}setTimeout(function(){if(id===SID)vib(pat);},500);}
    done(dur,id);}
  var BLUE=[[0,'rgba(92,150,220,.42)'],[.5,'rgba(130,180,235,.16)'],[.85,'rgba(170,210,250,0)']],
      GREY=[[0,'rgba(70,80,100,.4)'],[.45,'rgba(60,70,90,.12)'],[1,'rgba(60,70,90,0)']],
      STORM=[[0,'rgba(14,18,30,.62)'],[.45,'rgba(24,30,46,.3)'],[1,'rgba(24,30,46,.18)']];
  function sunny(){scene({sky:BLUE,sun:{x:.84,y:.13,big:1},cover:.26,tone:'bright',dur:6000});}
  function partly(){scene({sky:BLUE,sun:{x:.84,y:.13},cover:.48,tone:'bright',dur:6500});}
  function cloudy(){scene({sky:GREY,cover:.78,tone:'grey',dur:6500});}
  function rain(){scene({sky:STORM,cover:.92,tone:'dark',rain:1,dur:5500});}
  function thunder(){scene({sky:STORM,cover:.97,tone:'dark',rain:2,storm:1,dur:5800});}
  var fs=document.createElement('div');fs.id='fxs';fs.setAttribute('aria-hidden','true');document.body.appendChild(fs);var SKY=0;
  /* the sun and horizon glow go in a layer behind the page, so they never sit on top of the text */
  var fb=document.createElement('div');fb.id='fxb';fb.setAttribute('aria-hidden','true');document.body.appendChild(fb);
  function sky(kind){var id=++SKY,go=function(){if(id!==SKY)return;fs.className='fx-'+kind;fs.innerHTML='<div class="fx-tint"></div><div class="fx-glow"></div>';
      fb.className='fx-'+kind;fb.innerHTML='<div class="fx-hz"></div><div class="fx-sun"></div>';
      requestAnimationFrame(function(){requestAnimationFrame(function(){if(id===SKY)fs.classList.add('fx-on');});});
      setTimeout(function(){if(id!==SKY)return;fs.classList.remove('fx-on');setTimeout(function(){if(id===SKY){fs.className='';fs.innerHTML='';fb.className='';fb.innerHTML='';}},1700);},10600);};
    if(fs.classList.contains('fx-on')){fs.classList.remove('fx-on');setTimeout(go,500);}else go();}
  function weatherMoment(){var w=window.NK_WX,c=w&&w.current?w.current.weather_code:null;
    if(c==null){partly();return;}
    if(c>=95)thunder();else if((c>=51&&c<=67)||(c>=80&&c<=82))rain();else if(c===3||c===45||c===48)cloudy();else if(c===2)partly();else sunny();}
  /* tap the cards: the moment plays straight away (first tap); the forecast opens from its own link */
  function tapCard(el,fn){if(!el)return;el.addEventListener('click',function(e){if(e.target.closest('.gw-more'))return;e.preventDefault();ac();fn();});
    el.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();ac();fn();}});}
  tapCard(document.getElementById('gwSun'),function(){sky(ist().getUTCHours()<12?'dawn':'dusk');});
  var lastWx=0;
  tapCard(document.getElementById('gwWx'),function(){var n=Date.now();if(busy||n-lastWx<9000){lastWx=0;location.hash='#weather';return;}lastWx=n;weatherMoment();});
  /* play the moment for any weather code (used by the forecast) */
  function playCode(c,day){if(c==null)return;ac();if(c>=95)thunder();else if((c>=51&&c<=67)||(c>=80&&c<=82))rain();else if(c===3||c===45||c===48)cloudy();else if(c===2||c===1)partly();else if(day===false)scene({sky:[[0,'rgba(8,14,38,.55)'],[.6,'rgba(8,14,38,.15)'],[1,'rgba(8,14,38,0)']],cover:.18,tone:'grey',dur:5500});else sunny();}

  /* ---------- the night sky (11 PM – 3 AM) ---------- */
  function moonPhase(){var syn=29.530588853,ref=Date.UTC(2000,0,6,18,14)/864e5,now=Date.now()/864e5;var p=((now-ref)%syn+syn)%syn/syn;return p;} // 0 new, .5 full
  function drawMoon(cv,p){var s=cv.width,r=s*.36,cx=s/2,cy=s/2,x=cv.getContext('2d');x.clearRect(0,0,s,s);
    var g=x.createRadialGradient(cx,cy,r*.95,cx,cy,s*.5);g.addColorStop(0,'rgba(220,228,255,.18)');g.addColorStop(1,'rgba(220,228,255,0)');x.fillStyle=g;x.beginPath();x.arc(cx,cy,s*.5,0,7);x.fill();
    x.save();x.beginPath();x.arc(cx,cy,r,0,7);x.clip();
    var b=x.createRadialGradient(cx-r*.3,cy-r*.3,r*.1,cx,cy,r);b.addColorStop(0,'#f4f1e6');b.addColorStop(1,'#cfcab9');x.fillStyle=b;x.fillRect(0,0,s,s);
    [[-.35,-.2,.28],[.1,-.35,.2],[.25,.1,.3],[-.1,.3,.22],[-.42,.25,.14],[.38,-.12,.12]].forEach(function(m){var mg=x.createRadialGradient(cx+m[0]*r,cy+m[1]*r,0,cx+m[0]*r,cy+m[1]*r,m[2]*r);mg.addColorStop(0,'rgba(120,118,110,.45)');mg.addColorStop(1,'rgba(120,118,110,0)');x.fillStyle=mg;x.fillRect(0,0,s,s);});
    // shadow: waxing lights the right side, waning the left
    var k=Math.cos(2*Math.PI*p),wax=p<.5;x.fillStyle='rgba(6,10,22,.9)';x.shadowColor='rgba(6,10,22,.9)';x.shadowBlur=s*.02;x.beginPath();
    if(wax){x.arc(cx,cy,r,Math.PI/2,Math.PI*1.5,false);x.ellipse(cx,cy,Math.abs(k)*r,r,0,-Math.PI/2,Math.PI/2,k<0);}
    else{x.arc(cx,cy,r,-Math.PI/2,Math.PI/2,false);x.ellipse(cx,cy,Math.abs(k)*r,r,0,Math.PI/2,-Math.PI/2,k<0);}
    x.fill();x.restore();}
  /* ---- the sky behind the page follows the real sun over Mayapur: dawn, a soft day, a many-coloured sunset, dusk and a starry night ---- */
  function sunMin(rise){var d=ist(),N=Math.floor((Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate())-Date.UTC(d.getUTCFullYear(),0,0))/864e5),R=Math.PI/180,lat=23.4267,lng=88.388,lh=lng/15;
    var t=N+((rise?6:18)-lh)/24,M=.9856*t-3.289,L=(M+1.916*Math.sin(M*R)+.02*Math.sin(2*M*R)+282.634)%360,RA=Math.atan(.91764*Math.tan(L*R))/R;RA=(RA+360)%360;
    RA=(RA+(Math.floor(L/90)-Math.floor(RA/90))*90)/15;var sd=.39782*Math.sin(L*R),cd=Math.cos(Math.asin(sd)),ch=(Math.cos(90.833*R)-sd*Math.sin(lat*R))/(cd*Math.cos(lat*R));
    var H=(rise?360-Math.acos(ch)/R:Math.acos(ch)/R)/15,T=H+RA-.06571*t-6.622,UT=((T-lh)%24+24)%24;return Math.round(((UT+5.5)%24)*60);}
  function phase(){var d=ist(),m=d.getUTCHours()*60+d.getUTCMinutes(),sr=sunMin(true),ss=sunMin(false);
    if(m>=sr-40&&m<sr+50)return 'dawn';if(m>=sr+50&&m<ss-70)return 'day';if(m>=ss-70&&m<ss+35)return 'sunset';if(m>=ss+35&&m<ss+80)return 'dusk';return 'night';}
  /* how far through the sunrise or sunset we are, from the real sun over Mayapur.
     Sunset: 0 = 70 minutes before, .667 = the sunset minute, 1 = 35 minutes after. Sunrise: 0 = 40 minutes before, .444 = the sunrise minute, 1 = 50 minutes after.
     (?sun=0..1 previews any moment) */
  function sunPr(rise){var q=(location.search.match(/[?&]sun=([\d.]+)/)||[])[1];if(q!=null)return Math.max(0,Math.min(1,+q));if(/[?&]sky=(sunset|dawn)/.test(location.search))return rise?.7:.45;
    var d=ist(),m=d.getUTCHours()*60+d.getUTCMinutes()+d.getUTCSeconds()/60;return rise?Math.max(0,Math.min(1,(m-(sunMin(true)-40))/90)):Math.max(0,Math.min(1,(m-(sunMin(false)-70))/105));}
  /* can the sun be seen in Mayapur right now? 1 on a clear or partly cloudy sky, 0 when it is overcast, raining or stormy (then only a soft glow shows through) */
  function sunVis(){return typeof wxMode==='string'&&wxMode!=='clear'?0:1;}
  var ns=null,cur=null;
  function paint(ph){var c=ns.querySelector('canvas'),x=c.getContext('2d'),dpr=Math.min(2,window.devicePixelRatio||1),W=c.width=innerWidth*dpr,H=c.height=innerHeight*dpr;
    var seed=7;function rnd(){seed=(seed*16807)%2147483647;return seed/2147483647;}
    function grad(st){var g=x.createLinearGradient(0,0,0,H);st.forEach(function(q){g.addColorStop(q[0],q[1]);});x.fillStyle=g;x.fillRect(0,0,W,H);}
    function blob(cx,cy,rx,ry,col){x.save();x.translate(cx*W,cy*H);x.scale(1,ry/rx);var g=x.createRadialGradient(0,0,0,0,0,rx*W);g.addColorStop(0,col);g.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=g;x.beginPath();x.arc(0,0,rx*W,0,7);x.fill();x.restore();}
    function stars(k){var n=Math.round(innerWidth*innerHeight/2600*k);for(var i=0;i<n;i++){var r=rnd(),sz=r<.92?.5+rnd()*.6:1+rnd()*.9;x.fillStyle='rgba('+(r<.1?'255,236,214':r<.2?'214,226,255':'240,244,255')+','+((.25+rnd()*.6)*Math.min(1,k*1.4)).toFixed(2)+')';x.beginPath();x.arc(rnd()*W,rnd()*H*(k<1?.7:1),sz*dpr,0,7);x.fill();}}
    if(ph==='night'){grad([[0,'#050916'],[1,'#0b1226']]);stars(1);var mw=x.createLinearGradient(0,H*.1,W,H*.9);mw.addColorStop(0,'rgba(180,190,230,0)');mw.addColorStop(.5,'rgba(180,190,230,.05)');mw.addColorStop(1,'rgba(180,190,230,0)');x.fillStyle=mw;x.fillRect(0,0,W,H);}
    else if(ph==='dusk'){grad([[0,'#0a0f2a'],[.45,'#1e2160'],[.75,'#4a2d6e'],[.92,'#7a3a5e'],[1,'#a85a48']]);stars(.45);}
    else if(ph==='dawn'){/* sunrise, live: pr runs 0 (40 min before sunrise) to 1 (50 min after). The sun is still under the horizon at first (only its glow shows),
         crosses the horizon line at the real sunrise minute, then climbs while the sky turns from night blue to morning. */
      var dp=sunPr(true),pre=Math.min(1,dp/.444),up=Math.max(0,(dp-.444)/.556),hzd=.735,vis=sunVis();
      function mx(a,b,t){var o='#';for(var q=1;q<7;q+=2){var u=parseInt(a.substr(q,2),16),v=parseInt(b.substr(q,2),16);o+=('0'+Math.round(u+(v-u)*t).toString(16)).slice(-2);}return o;}
      grad([[0,mx('#0f1538','#27407e',dp)],[.4,mx('#262b63','#4a6aa8',dp)],[.6,mx('#5c4d86','#9aa0c4',dp)],[.69,mx('#b47f88','#efc8a2',dp)],[hzd,mx('#eeb488','#ffe2a8',dp)],[.76,mx('#6c566f','#8a7a86',dp)],[1,mx('#1a2340','#263a5c',dp)]]);
      stars(.34*(1-dp));
      var dx=.36*W,dy=(up>0?hzd-(hzd-.42)*up:hzd+.07*(1-pre))*H,dr=Math.min(W,H)*(.056-.01*up);
      x.globalCompositeOperation='screen';blob(.36,Math.min(hzd,dy/H),.4,.3,'rgba(255,214,150,'+((.16+.2*pre)*(.35+.65*vis)).toFixed(2)+')');blob(.36,Math.min(hzd,dy/H),.18,.18,'rgba(255,226,170,'+((.2+.3*pre)*vis).toFixed(2)+')');x.globalCompositeOperation='source-over';
      if(vis>.5){x.save();x.beginPath();x.rect(0,0,W,hzd*H);x.clip();var dg=x.createRadialGradient(dx,dy,0,dx,dy,dr*1.5);dg.addColorStop(0,up<.35?'#ffe9a8':'#fffbe6');dg.addColorStop(.5,up<.35?'#ffd070':'#fff0b8');dg.addColorStop(.66,up<.35?'#ffb04a':'#ffe08a');dg.addColorStop(.72,'rgba(255,200,110,.45)');dg.addColorStop(1,'rgba(255,200,110,0)');
        x.fillStyle=dg;x.beginPath();x.arc(dx,dy,dr*1.5,0,7);x.fill();x.restore();
        x.globalCompositeOperation='screen';blob(.36,.82,.1,.1,'rgba(255,214,150,'+(.2*up+.06).toFixed(2)+')');x.globalCompositeOperation='source-over';}}
    else if(ph==='day'){grad([[0,'#2d5cad'],[.4,'#27508f'],[.75,'#1d3a6c'],[1,'#16294f']]);var sx=.78*W,sy=.2*H,sr=Math.min(W,H)*.042;blob(.78,.2,.5,.5,'rgba(255,228,170,.3)');blob(.78,.2,.16,.16,'rgba(255,240,205,.45)');
      if(sunVis()>.5){var sd=x.createRadialGradient(sx,sy,0,sx,sy,sr*1.5);sd.addColorStop(0,'#fffdf2');sd.addColorStop(.62,'#fff1c4');sd.addColorStop(.8,'rgba(255,226,150,.55)');sd.addColorStop(1,'rgba(255,220,140,0)');x.fillStyle=sd;x.beginPath();x.arc(sx,sy,sr*1.5,0,7);x.fill();}
      for(var i=0;i<6;i++)blob(.1+rnd()*.8,.08+rnd()*.5,.12+rnd()*.12,.04,'rgba(220,230,255,.05)');}
    else {/* sunset: violet top, purple, pink, red and gold at the horizon, with the sun itself sinking. pr runs 0 (70 min before sunset) to 1 (35 min after);
         the sun reaches the horizon line at the real sunset minute and then slips behind it, while the sky deepens. */
      var pr=sunPr(false),vis=sunVis(),k=Math.min(1,pr/.667),late=Math.max(0,(pr-.667)/.333),hz=.735,sx2=.64*W,sy2=(.4+(hz-.4)*k+late*.09)*H,sr2=Math.min(W,H)*(.05+.012*k);
      grad([[0,'#1d2857'],[.28,'#35467f'],[.46,'#6c6690'],[.58,'#b07f7e'],[.67,'#e2935c'],[.715,'#f6ae62'],[hz,'#ffc47a'],[.75,'#c97a4c'],[.82,'#54455f'],[1,'#212d4a']]);
      blob(.2,.52,.26,.07,'rgba(255,190,190,.2)');blob(.84,.48,.22,.06,'rgba(255,200,190,.18)');
      /* glow round the sun: gold close in, then red, then pink-purple further out */
      /* the glow only ever adds light (screen), so it can never leave a muddy dark ring where it crosses the blue of the sky */
      x.globalCompositeOperation='screen';blob(.64,sy2/H,.36,.3,'rgba(255,170,110,'+(.34-.14*late).toFixed(2)+')');blob(.64,sy2/H,.17,.17,'rgba(255,190,120,'+(.46-.2*late).toFixed(2)+')');blob(.64,sy2/H,.08,.08,'rgba(255,210,150,.5)');x.globalCompositeOperation='source-over';
      if(vis>.5){x.save();x.beginPath();x.rect(0,0,W,hz*H);x.clip(); /* the sun is hidden below the horizon line, and behind the cloud on an overcast or rainy evening */
      var sg=x.createRadialGradient(sx2,sy2,0,sx2,sy2,sr2*1.5);/* one plain reddish-orange disc, a touch redder as it gets low */var c0=k<.5?'#ffb766':'#ffa655',c1=k<.5?'#ff9344':'#ff7e3a',c2=k<.5?'#fb6f30':'#f25c2c';sg.addColorStop(0,c0);sg.addColorStop(.4,c1);sg.addColorStop(.64,c2);sg.addColorStop(.7,'rgba(240,84,44,.45)');sg.addColorStop(1,'rgba(240,84,44,0)');
      x.fillStyle=sg;x.beginPath();x.arc(sx2,sy2,sr2*1.5,0,7);x.fill();x.restore();}
      /* its light lying on the water below the horizon */
      x.globalCompositeOperation='screen';blob(.64,.82,.1+.04*k,.1,'rgba(255,160,90,'+(.2-.13*late).toFixed(2)+')');x.globalCompositeOperation='source-over';
      if(late>0){x.fillStyle='rgba(18,14,52,'+(.34*late).toFixed(2)+')';x.fillRect(0,0,W,H);}}
  }
  /* slow drifting clouds for the daytime sky: painted once, then moved by the browser (cheap) */
  var dcl=null;
  function cloudTile(th,soft,lit,shade,full){var Wc=1024,Hc=384,c=document.createElement('canvas');c.width=Wc;c.height=Hc;var x=c.getContext('2d'),im=x.createImageData(Wc,Hc),D=im.data,gr={},sd=th*91.7;
    function h2(i,j,p){i=((i%p)+p)%p;var k=i+','+j+','+p;if(gr[k]===undefined){var n=Math.sin(i*127.1+j*311.7+p*74.7+sd)*43758.5453;gr[k]=n-Math.floor(n);}return gr[k];}
    function vn(u,v,p){var xi=Math.floor(u),yi=Math.floor(v),xf=u-xi,yf=v-yi,a=xf*xf*(3-2*xf),b=yf*yf*(3-2*yf),q=h2(xi,yi,p),r=h2(xi+1,yi,p),s=h2(xi,yi+1,p),t=h2(xi+1,yi+1,p);return q+(r-q)*a+(s-q)*b+(q-r-s+t)*a*b;}
    function fb(u,v){var t=0,am=.5,p=5;for(var o=0;o<5;o++){t+=am*vn(u*p,v*p*.55,p);p*=2;am*=.5;}return t;}
    for(var j=0;j<Hc;j++){var vy=j/Hc,fade=full?Math.min(1,vy*8)*(1-.55*vy):Math.min(1,vy*6)*Math.pow(Math.max(0,1-vy),1.2);for(var i=0;i<Wc;i++){var u=i/Wc,n=fb(u,vy),d=(n-th)/soft;d=Math.max(0,Math.min(1,d));d=d*d*(3-2*d);
      var up=fb(u,vy-.02),l=Math.max(0,Math.min(1,.55+(n-up)*7)),k=(j*Wc+i)*4;D[k]=shade[0]+(lit[0]-shade[0])*l;D[k+1]=shade[1]+(lit[1]-shade[1])*l;D[k+2]=shade[2]+(lit[2]-shade[2])*l;D[k+3]=255*d*fade;}}
    x.putImageData(im,0,0);return 'url('+c.toDataURL()+')';}
  /* clouds for the sunset sky: broad, streaky banks. The low sun lights them from underneath, so the undersides and thin edges glow
     (gold and orange low down, red and pink higher up) while the thick middles and tops stay dusky purple. */
  var scl=null;
  function sunsetTile(){var Wc=1100,Hc=560,c=document.createElement('canvas');c.width=Wc;c.height=Hc;var x=c.getContext('2d'),im=x.createImageData(Wc,Hc),D=im.data,Nn=new Float32Array(Wc*Hc);
    function h2(i,j,p){i=((i%p)+p)%p;var n=Math.sin(i*127.1+j*311.7+p*74.7+41.3)*43758.5453;return n-Math.floor(n);}
    function vn(u,v,p){var xi=Math.floor(u),yi=Math.floor(v),xf=u-xi,yf=v-yi,a=xf*xf*(3-2*xf),b=yf*yf*(3-2*yf),q=h2(xi,yi,p),r=h2(xi+1,yi,p),s=h2(xi,yi+1,p),t=h2(xi+1,yi+1,p);return q+(r-q)*a+(s-q)*b+(q-r-s+t)*a*b;}
    function fb(u,v,oc){var t=0,am=.5,p=3;for(var o=0;o<oc;o++){t+=am*vn(u*p,v*p*1.25,p);p*=2;am*=.5;}return t;}
    var i,j,Hu=new Float32Array(Wc*Hc);for(j=0;j<Hc;j++)for(i=0;i<Wc;i++){var u=i/Wc,v=j/Hc,w=fb(u+.21,v+.47,2)-.36;Hu[j*Wc+i]=w;Nn[j*Wc+i]=fb(u+w*.22,v+w*.12,7);}
    function mix(a,b,t){return a+(b-a)*t;}
    for(j=0;j<Hc;j++){var vy=j/Hc,th=.47+.03*Math.cos(vy*5.2),fade=Math.min(1,vy*9)*Math.min(1,(1-vy)*5);for(i=0;i<Wc;i++){var n=Nn[j*Wc+i],d=Math.max(0,Math.min(1,(n-th)/.075));d=d*d*(3-2*d);if(!d){continue;}
      var dep=Math.max(0,Math.min(1,(n-th)/.2)),nb=Nn[Math.min(Hc-1,j+12)*Wc+i],und=Math.max(0,Math.min(1,.42+(n-nb)*15)),rim=Math.pow(1-dep,2.4),l=Math.max(0,Math.min(1,Math.pow(und,1.4)*(.82-dep*.4)+rim*.3)),k=(j*Wc+i)*4;
      /* colour of the light: red and hot pink up high, orange in the middle, gold near the horizon, varied a little from cloud to cloud */
      var hu=Math.max(0,Math.min(1,vy*1.1+Hu[j*Wc+i]*.8)),lr=252,lg=mix(158,196,hu),lb=mix(140,118,hu);
      var sr=mix(78,104,vy),sg=mix(76,84,vy),sb=mix(112,108,vy);
      D[k]=mix(sr,lr,l);D[k+1]=mix(sg,lg,l);D[k+2]=mix(sb,lb,l);D[k+3]=255*d*fade*.8;}}
    x.putImageData(im,0,0);return 'url('+c.toDataURL()+')';}
  function sunsetClouds(){if(scl||!ns)return;scl=document.createElement('div');scl.className='suncl';scl.style.backgroundImage=sunsetTile();ns.insertBefore(scl,ns.querySelector('.moon'));}
  var ncl=null;
  function nightClouds(){if(ncl||!ns)return;ncl=document.createElement('div');ncl.className='nightcl';ncl.style.backgroundImage=cloudTile(.57,.16,[150,162,196],[44,52,84]);ns.appendChild(ncl);}
  function dayClouds(){if(dcl||!ns)return;dcl=document.createElement('div');dcl.className='daycl';dcl.style.backgroundImage=cloudTile(.5,.2,[255,255,255],[205,215,232]);ns.insertBefore(dcl,ns.querySelector('.moon'));}
  /* ---- live weather behind the page: overcast, rain and thunderstorms follow the real weather in Mayapur (preview with ?wx=cloudy, ?wx=rain, ?wx=storm) ---- */
  var wxMode='clear',wxEl=null,wxRAF=0,wxDrops=[],wxBolt=null,wxNext=0,wxPrev=(location.search.match(/[?&]wx=(clear|cloudy|rain|storm|snow)/)||[])[1];if(wxPrev==='snow')wxPrev='cloudy'; /* snow (preview only, ?wx=snow) uses the overcast sky; the flakes and the snow caps are drawn by the snow block at the end of the page */
  function wxSetup(){if(wxEl||!ns)return;wxEl={};var mk=function(tag,cls){var e=document.createElement(tag);e.className=cls;ns.insertBefore(e,ns.querySelector('.moon'));return e;};
    wxEl.tint=mk('div','wxtint');wxEl.dark=mk('div','wxdark');wxEl.dark.style.backgroundImage=cloudTile(.36,.26,[150,158,172],[52,58,72],1);wxEl.glow=mk('div','wxglow');wxEl.heavy=mk('div','wxheavy');wxEl.black=mk('div','wxblack');wxEl.rain=mk('canvas','wxrain');wxEl.flash=mk('div','wxflash');}
  /* heavy storm cloud: big dark billowing masses, thick overhead and breaking up lower down, with paler edges so the lightning glows through the gaps */
  function stormTile(){var Wc=880,Hc=512,c=document.createElement('canvas');c.width=Wc;c.height=Hc;var x=c.getContext('2d'),im=x.createImageData(Wc,Hc),D=im.data,Nn=new Float32Array(Wc*Hc);
    function h2(i,j,p){i=((i%p)+p)%p;var n=Math.sin(i*127.1+j*311.7+p*74.7+13.7)*43758.5453;return n-Math.floor(n);}
    function vn(u,v,p){var xi=Math.floor(u),yi=Math.floor(v),xf=u-xi,yf=v-yi,a=xf*xf*(3-2*xf),b=yf*yf*(3-2*yf),q=h2(xi,yi,p),r=h2(xi+1,yi,p),s=h2(xi,yi+1,p),t=h2(xi+1,yi+1,p);return q+(r-q)*a+(s-q)*b+(q-r-s+t)*a*b;}
    function fb(u,v,oc){var t=0,am=.5,p=3;for(var o=0;o<oc;o++){t+=am*vn(u*p,v*p*.62,p);p*=2;am*=.5;}return t;}
    var i,j;for(j=0;j<Hc;j++)for(i=0;i<Wc;i++){var u=i/Wc,v=j/Hc,w=fb(u+.37,v+.61,2)-.36;Nn[j*Wc+i]=fb(u+w*.16,v+w*.22,6);}
    for(j=0;j<Hc;j++){var vy=j/Hc,sm=vy*vy*(3-2*vy),th=.33+.27*sm,fade=Math.min(1,(1-vy)*7);for(i=0;i<Wc;i++){var n=Nn[j*Wc+i],d=Math.max(0,Math.min(1,(n-th)/.07));d=d*d*(3-2*d);
      var dep=Math.max(0,Math.min(1,(n-th)/.2)),nb=Nn[Math.min(Hc-1,j+9)*Wc+i],tx=Math.max(-1,Math.min(1,(n-nb)*16)),e=Math.pow(1-dep,1.6),k=(j*Wc+i)*4,sh=tx*16*dep;
      D[k]=12+96*e+sh;D[k+1]=14+98*e+sh;D[k+2]=21+108*e+sh*1.1;D[k+3]=255*d*fade;}}
    x.putImageData(im,0,0);return 'url('+c.toDataURL()+')';}
  /* lightning shapes: jagged channels made by repeated mid-point shifts, with forks */
  function wxPath(x0,y0,x1,y1,rough){var p=[[x0,y0],[x1,y1]],d=Math.hypot(x1-x0,y1-y0)*rough;for(var it=0;it<6;it++){var q=[p[0]];for(var i=1;i<p.length;i++){var a=p[i-1],b=p[i],nx=-(b[1]-a[1]),ny=b[0]-a[0],nl=Math.hypot(nx,ny)||1,o=(Math.random()-.5)*d;q.push([(a[0]+b[0])/2+nx/nl*o,(a[1]+b[1])/2+ny/nl*o],b);}p=q;d*=.56;}return p;}
  function wxFork(list,p,w,depth){list.push({p:p,w:w});if(depth>1)return;var n=depth?(Math.random()<.5?1:0):2+(Math.random()*4|0),last=p[p.length-1];for(var k=0;k<n;k++){var i=(p.length*(.12+Math.random()*.62))|0,a=p[i],b=p[Math.min(p.length-1,i+8)],ang=Math.atan2(b[1]-a[1],b[0]-a[0])+(Math.random()<.5?-1:1)*(.3+Math.random()*.65),len=Math.hypot(last[0]-a[0],last[1]-a[1])*(.25+Math.random()*.45);if(len<36)continue;wxFork(list,wxPath(a[0],a[1],a[0]+Math.cos(ang)*len,a[1]+Math.sin(ang)*len,.24),w*.45,depth+1);}}
  function wxLoop(now){wxRAF=0;if(wxMode!=='rain'&&wxMode!=='storm')return;if(document.hidden){wxRAF=requestAnimationFrame(wxLoop);return;}var c=wxEl.rain,x=c.getContext('2d');if(c.width!==innerWidth||c.height!==innerHeight){c.width=innerWidth;c.height=innerHeight;wxDrops=[];}
    var N=Math.round(innerWidth/(wxMode==='storm'?7:11));while(wxDrops.length<N)wxDrops.push({x:Math.random()*c.width*1.1,y:Math.random()*c.height,l:9+Math.random()*10,v:7+Math.random()*5,a:.16+Math.random()*.26});wxDrops.length=N;
    x.clearRect(0,0,c.width,c.height);x.lineCap='round';x.lineWidth=1.1;wxDrops.forEach(function(d){x.strokeStyle='rgba(200,215,235,'+d.a+')';x.beginPath();x.moveTo(d.x,d.y);x.lineTo(d.x-d.l*.18,d.y+d.l);x.stroke();d.y+=d.v;d.x-=d.v*.18;if(d.y>c.height){d.y=-d.l;d.x=Math.random()*c.width*1.1;}});
    if(wxMode==='storm'){wxMood(now);if(!wxNext)wxNext=now+2500;if(now>wxNext){wxNext=now+10000+Math.random()*2000;wxStrike(now);}
      if(wxBolt){var e=now-wxBolt.t,fl=0;var bl=0;wxBolt.pl.forEach(function(q){var k=(e-q.t)/q.d,v;if(k>=0&&k<1){v=q.a*(k<.08?k/.08:k<.2?1-(k-.08)*4.5:k<.32?.46+(k-.2)*3.5:.88*(1-(k-.32)/.68));fl=Math.max(fl,v);if(!q.g)bl=Math.max(bl,v);}});if(0)wxBolt.pl.forEach(function(q){var k=(e-q.t)/q.d;if(k>=0&&k<1)fl=Math.max(fl,q.a*(k<.08?k/.08:k<.2?1-(k-.08)*4.5:k<.32?.46+(k-.2)*3.5:.88*(1-(k-.32)/.68)));});
        wxBolt.g=Math.max(fl,wxBolt.g*.94);if(bl>.02){x.globalAlpha=Math.min(1,bl);x.drawImage(wxBolt.img,0,0,c.width,c.height);x.globalAlpha=1;}
        wxEl.glow.style.opacity=(wxBolt.g*wxBolt.k).toFixed(3);wxEl.flash.style.opacity=(wxBolt.g*wxBolt.fk*wxBolt.k).toFixed(3);if(e>wxBolt.end&&wxBolt.g<.012){wxEl.glow.style.opacity=wxEl.flash.style.opacity=0;wxBolt=null;}}}
    wxRAF=requestAnimationFrame(wxLoop);}
  /* the storm breathes: for a while you can see sky between the clouds, then the black clouds close in over the whole page for 20 to 30 seconds
     and slowly open again. Every time the clouds sit somewhere else, so it never looks like the same moment coming back. (?dark=1 starts in the black phase) */
  var wxMoodT=0,wxDarkPrev=/[?&]dark=1/.test(location.search);
  function wxMood(now){var bk=wxEl.black;if(!wxMoodT){wxMoodT=now+(wxDarkPrev?600:26000+Math.random()*26000);return;}if(now<wxMoodT)return;
    if(!bk.classList.contains('on')){bk.style.backgroundPosition=(Math.random()*100).toFixed(0)+'% '+(Math.random()*100).toFixed(0)+'%';bk.style.transform='scaleX('+(Math.random()<.5?-1:1)+')';bk.classList.add('on');wxMoodT=now+30000+Math.random()*10000;
      setTimeout(function(){if(!wxEl)return;wxEl.heavy.style.backgroundPositionX=(Math.random()*100).toFixed(0)+'%';wxEl.heavy.style.top=(-10+Math.random()*9).toFixed(1)+'%';wxEl.heavy.style.height=(88+Math.random()*18).toFixed(0)+'%';wxEl.dark.style.backgroundPositionX=(Math.random()*100).toFixed(0)+'%';},14000);}
    else{bk.classList.remove('on');wxMoodT=now+45000+Math.random()*40000;}}
  /* each strike: its own shape (single bolt, cloud crawler, or two or three bolts at once), its own colour taken from real storm photos, and its own length of thunder */
  var wxPals=[['#f3f1ff','#c6c3f0','#7a7dc0','#2b2f5c',1],['#fff8ee','#eeddc4','#a48f7c','#352e2e',.62],['#e9f4ff','#a8c8ee','#4f709e','#18243a',1],['#fbe8ff','#eaa6e2','#9860be','#362a62',1],['#ffffff','#dfe6f5','#8f9bb8','#262c3c',.9],['#fff0f4','#f0b4c6','#a8668e','#3c2a52',.85],['#eef0ff','#9fa8ff','#5560c8','#1c2050',1]],wxPalI=Math.random()*7|0;
  var wxPlan=[[0,4,5],[2,1.2,2],[5,4.5,5.5,'build'],[3,3,4],[4,5,6,'corner'],[0,1,1.8],[1,4,5.5],[2,2.5,3.5],[5,3.8,4.6,'build'],[3,1.6,2.2],[4,4.5,6],[1,3,4.2,'corner']];
  function wxStrike(now){now=now||performance.now();var W=innerWidth,H=innerHeight,pal=wxPals[wxPalI++%wxPals.length],plan=wxPlan[wxSeqI++%wxPlan.length],kind=plan[0],blk=wxEl.black.classList.contains('on'),mode=blk?'edge':plan[3]==='corner'?'corner':'',slow=plan[3]==='build',len=plan[1]+Math.random()*(plan[2]-plan[1]),list=[],starts=[],shape=Math.random(),sx=W*(.16+Math.random()*.68),sy=H*(.03+Math.random()*.1),k,sc=Math.max(.75,Math.min(1.25,W/1300)),gx=sx,gy=sy+H*.08;
    if(blk)pal=[['#f4f8ff','#cfd9ee','#5d6680','#05060a',1],['#eaf2ff','#a9c4ee','#4a5f88','#04060c',1],['#ffffff','#d9dce8','#666b7c','#06060a',1]][Math.random()*3|0];
    if(mode==='edge'){var de=Math.random()<.6?1:-1,xe0=de>0?-20:W+20,ye0=H*(.36+Math.random()*.22),xe1=W*(de>0?.42+Math.random()*.22:.36+Math.random()*.22),ye1=ye0-H*(.02+Math.random()*.09),pe=wxPath(xe0,ye0,xe1,ye1,.13);list.push({p:pe,w:2.6*sc,tp:1});
      if(Math.random()<.5){var qe=pe[(pe.length*(.45+Math.random()*.3))|0];wxFork(list,wxPath(qe[0],qe[1],qe[0]+de*W*(.05+Math.random()*.06),qe[1]+H*(.05+Math.random()*.06),.24),.9*sc,1);}gx=de>0?W*.03:W*.97;gy=ye0;}
    else if(mode==='corner'){var dr=Math.random()<.5?1:-1,x0c=dr>0?-20:W+20,y0c=H*(.03+Math.random()*.1),x1c=dr>0?W*(.56+Math.random()*.24):W*(.2+Math.random()*.24),y1c=H*(.3+Math.random()*.22),pc=wxPath(x0c,y0c,x1c,y1c,.15),main={p:pc,w:3.6*sc,tp:1};list.push(main);
      for(k=0;k<4+(Math.random()*3|0);k++){var qi=(pc.length*(.25+Math.random()*.7))|0,qa=pc[qi],an=(dr>0?0:Math.PI)+dr*(.35+Math.random()*.9),ln=H*(.1+Math.random()*.22)*(qi/pc.length+.3);wxFork(list,wxPath(qa[0],qa[1],qa[0]+Math.cos(an)*ln,qa[1]+Math.abs(Math.sin(an))*ln,.24),1.5*sc*(qi/pc.length+.25),1);}
      gx=(x0c+x1c)/2+dr*W*.12;gy=(y0c+y1c)/2;}
    else if(shape<.24){var dir=sx>W/2?-1:1,ex=sx+dir*W*(.34+Math.random()*.3);starts.push([sx,sy+H*.05]);wxFork(list,wxPath(sx,sy+H*.05,ex,sy+H*(.04+Math.random()*.2),.2),2.1*sc,0);if(Math.random()<.6){var mx=sx+dir*W*(.1+Math.random()*.12);starts.push([mx,sy+H*.07]);wxFork(list,wxPath(mx,sy+H*.07,mx+(Math.random()-.5)*W*.16,H*(.68+Math.random()*.22),.16),2.4*sc,0);}}
    else{var nb=shape>.76?2+(Math.random()*2|0):1;for(k=0;k<nb;k++){var x0=sx+(k?(Math.random()-.5)*W*.42:0),y0=sy+(k?Math.random()*H*.08:0);starts.push([x0,y0]);wxFork(list,wxPath(x0,y0,x0+(Math.random()-.5)*W*.22,H*(.66+Math.random()*.26),.17),(k?1.6:2.6)*sc,k?1:0);}}
    var c=document.createElement('canvas');c.width=W;c.height=H;var x=c.getContext('2d');x.lineCap=x.lineJoin='round';
    /* tapered channels grow from a hair-thin start to full width; ordinary ones keep one width */
    function st(o,col,m,blur,al){x.globalAlpha=al;x.shadowColor=col;x.shadowBlur=blur;x.strokeStyle=col;var P=o.p,n=P.length,q;if(!o.tp){x.lineWidth=o.w*m;x.beginPath();for(q=0;q<n;q++)q?x.lineTo(P[q][0],P[q][1]):x.moveTo(P[q][0],P[q][1]);x.stroke();return;}
      for(var a0=0;a0<n-1;a0+=3){var f=(a0+1.5)/n;x.lineWidth=Math.max(.5,o.w*m*(.12+.88*f*f));x.beginPath();x.moveTo(P[a0][0],P[a0][1]);for(q=a0+1;q<=Math.min(n-1,a0+3);q++)x.lineTo(P[q][0],P[q][1]);x.stroke();}}
    list.forEach(function(o){st(o,pal[1],4.5,38,.28);st(o,pal[0],1.7,14,.85);st(o,'#ffffff',.75,0,1);});
    /* the top of each bolt melts into the cloud it comes out of, so it never starts from nowhere */
    x.shadowBlur=0;x.globalAlpha=1;x.globalCompositeOperation='destination-out';starts.forEach(function(q){var r=H*.17,g=x.createRadialGradient(q[0],q[1]-H*.03,0,q[0],q[1]-H*.03,r);g.addColorStop(0,'rgba(0,0,0,1)');g.addColorStop(.35,'rgba(0,0,0,.85)');g.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=g;x.fillRect(q[0]-r,q[1]-H*.03-r,r*2,r*2);});x.globalCompositeOperation='source-over';
    /* slow start: the cloud flickers faintly for a second or so, then the big bolt and the loud thunder */
    var tb=slow?1100+Math.random()*500:0,pl=[],span=Math.min(len*.5,2.6)*1000,np=len<2.2?(Math.random()<.5?1:0):kind===4?5+(Math.random()*3|0):2+(Math.random()*3|0),end=700;
    if(tb){var nq=4+(Math.random()*3|0);for(k=0;k<nq;k++){var tq=tb*(k+Math.random()*.7)/nq;pl.push({t:tq,a:.1+.3*(tq/tb)+Math.random()*.08,d:220+Math.random()*260,g:1});}}
    pl.push({t:tb,a:1,d:430+Math.random()*220});for(k=0;k<np;k++)pl.push({t:tb+(kind===4?150+Math.random()*1900:130+Math.random()*span),a:.45+Math.random()*.5,d:260+Math.random()*400});pl.forEach(function(q){end=Math.max(end,q.t+q.d);});
    wxBolt={t:now,img:c,pl:pl,end:end,g:0,k:pal[4],fk:blk?.8:.3};[wxEl.glow,wxEl.flash].forEach(function(el){el.style.setProperty('--bx',(gx/W*100)+'%');el.style.setProperty('--by',(gy/H*100)+'%');el.style.setProperty('--c1',pal[0]);el.style.setProperty('--c2',pal[1]);el.style.setProperty('--c3',pal[2]);el.style.setProperty('--c4',pal[3]);});
    if(wxSnd&&!wxMute&&!document.hidden){if(tb){wxBuild=tb/1000+.2;wxThunder(.02,.8,5,len);}else wxThunder(kind===2?.5+Math.random()*.4:.15+Math.random()*.3,len>4?.8:.64,kind,len);}}
  function wxAmbient(){var w=window.NK_WX,c=w&&w.current?w.current.weather_code:null,m=wxPrev||(c==null?'clear':c>=95?'storm':((c>=51&&c<=67)||(c>=80&&c<=82))?'rain':(c===3||c===45||c===48)?'cloudy':'clear');
    if(m===wxMode)return;wxMode=m;if(cur&&ns)paint(cur);if(m!=='clear')wxSetup();if((m==='rain'||m==='storm')&&wxEl&&!wxEl.heavyOn){wxEl.heavyOn=1;wxEl.heavy.style.backgroundImage=wxEl.black.style.backgroundImage=stormTile();}if(wxEl){wxEl.black.classList.remove('on');wxMoodT=0;}if(wxEl){wxBolt=null;wxEl.glow.style.opacity=wxEl.flash.style.opacity=0;}var de=document.documentElement;de.classList.remove('wx-cloudy','wx-rain','wx-storm');if(m!=='clear')de.classList.add('wx-'+m);wxNext=0;
    if((m==='rain'||m==='storm')&&!wxRAF&&!RM)wxRAF=requestAnimationFrame(wxLoop);if(wxEl&&m!=='rain'&&m!=='storm'){var x=wxEl.rain.getContext('2d');x.clearRect(0,0,wxEl.rain.width,wxEl.rain.height);}if(wxRainN){var n0=wxRainN;wxRainN=null;n0.forEach(function(q){try{q.s.stop();}catch(e){}});}wxAudio();}
  /* soft rain and thunder sound for the live weather. Browsers only allow sound after the visitor's first tap or key press. */
  var wxSnd=false,wxMute=false,wxRainN=null,wxBtn=null,wxUnlockT=0;try{wxMute=localStorage.getItem('nk_wxmute2')==='1';}catch(e){}
  var RAINVOL=.014,wxVol=1,wxMaster=null,wxSl=null,wxBuild=0;try{var v0=parseFloat(localStorage.getItem('nk_wxvol'));if(v0>=0&&v0<=1.6)wxVol=v0;}catch(e){}
  function wxOut(){if(!wxMaster){wxMaster=AC.createGain();wxMaster.gain.value=wxVol;wxMaster.connect(AC.destination);}return wxMaster;}
  function loopBuf(brown){var sr=AC.sampleRate,n=sr*8,f=sr*1,b=AC.createBuffer(1,n,sr),d=b.getChannelData(0),l=0,i;for(i=0;i<n+f;i++){var w=Math.random()*2-1,v;if(brown){l=(l+.02*w)/1.02;v=l*3.5;}else v=w;if(i<n)d[i]=v;else{var k=(i-n)/f;d[i-n]=d[i-n]*k+v*(1-k);}}return b;}
  /* steady rain: no pitched "plip" drops at all (those sounded like a tap filling a pot). The sound is thousands of tiny, soft bursts of
     shaped noise (rain hitting leaves, roof and ground) over a quiet, even wash. Stereo, built once as a 12 second loop that joins without a seam. */
  function rainBuf(){var sr=AC.sampleRate,n=Math.floor(sr*12),f=sr,b=AC.createBuffer(2,n,sr),TP=Math.PI*2,i,k;
    function band(lo,hi){var o=new Float32Array(n),a1=1-Math.exp(-TP*hi/sr),a2=1-Math.exp(-TP*lo/sr),y1=0,y2=0,z1=0,z2=0;for(var j=0;j<n+f;j++){var w=Math.random()*2-1;y1+=a1*(w-y1);z1+=a1*(y1-z1);y2+=a2*(z1-y2);z2+=a2*(y2-z2);var v=z1-z2;if(j<n)o[j]=v;else{var c=(j-n)/f;o[j-n]=o[j-n]*c+v*(1-c);}}return o;}
    var B=[band(500,1500),band(1400,3600),band(3200,7500)],BW=[.9,1,.55];
    for(var ch=0;ch<2;ch++){var d=b.getChannelData(ch),o1=Math.floor(Math.random()*n),o2=Math.floor(Math.random()*n);
      /* the even wash of rain further away */
      for(i=0;i<n;i++)d[i]=.5*B[0][(i+o1)%n]+.42*B[1][(i+o2)%n]+.16*B[2][(i+o1+o2)%n];
      /* the rain close by: soft noise bursts, about 1100 a second on each side, most of them faint and a few a little clearer */
      var grains=1100*12;for(var q=0;q<grains;q++){var r=Math.random(),bi=r<.3?0:r<.8?1:2,src=B[bi],at=Math.floor(Math.random()*n),off=Math.floor(Math.random()*n),tau=sr*(.002+Math.random()*.007),dec=Math.exp(-1/tau),len=Math.floor(tau*4),a=BW[bi]*(.5+3.2*Math.pow(Math.random(),4)),e=1,atk=sr*.0006;
        for(i=0;i<len;i++){var x=at+i;if(x>=n)x-=n;var y=off+i;if(y>=n)y-=n;d[x]+=a*e*(i<atk?i/atk:1)*src[y];e*=dec;}}
      /* the rain breathes a little, in whole cycles so the loop stays seamless */
      var p1=Math.random()*TP,p2=Math.random()*TP;for(i=0;i<n;i++){var tt=i/n;d[i]*=.8*(1+.1*Math.sin(TP*tt+p1)+.06*Math.sin(TP*2*tt+p2));}
      /* drops landing on leaves and branches, over the steady rain: separate taps you can pick out, some soft and some clearly louder.
         Each is a short burst of noise (a dull "tup" from the leaf plus a crisp edge), never a musical "plip". Now and then two or three fall close together, as when a leaf tips its water. */
      var hit=function(at,amp){var tb=sr*(.006+Math.random()*.012),tc=sr*(.0015+Math.random()*.003),db=Math.exp(-1/tb),dc=Math.exp(-1/tc),len=Math.floor(tb*5),ob=Math.floor(Math.random()*n),oc=Math.floor(Math.random()*n),eb=1,ec=1,wb=.5+Math.random()*.9,wc=.5+Math.random()*.8,hi=Math.random()<.5?B[1]:B[2],ak=sr*.0008;
        for(var z=0;z<len;z++){var x=at+z;if(x>=n)x-=n;var y1=ob+z;if(y1>=n)y1-=n;var y2=oc+z;if(y2>=n)y2-=n;d[x]+=amp*(z<ak?z/ak:1)*(wb*eb*B[0][y1]*3.2+wc*ec*hi[y2]*2.2);eb*=db;ec*=dc;}};
      var taps=Math.floor(14*12);for(var t2=0;t2<taps;t2++){var at3=Math.floor(Math.random()*n),r3=Math.random(),amp3=r3<.6?.9+Math.random()*1.3:r3<.9?2.4+Math.random()*2.2:4+Math.random()*2.6;hit(at3,amp3);
        if(Math.random()<.16){var more=1+(Math.random()*2|0),gap=at3;for(var m2=0;m2<more;m2++){gap+=Math.floor(sr*(.07+Math.random()*.16));hit(gap%n,amp3*(.45+Math.random()*.4));}}}}
    return b;}
  /* a deep, rolling thunder: soft crack, then a long low rumble that rolls two or three times and fades */
  /* real-sounding thunder, from short 1 to 2 second claps up to 6 second giants, five clearly different kinds:
     0 close strike (loud tearing crack, then a boom that fades) · 1 rolling thunder (three swells) · 2 deep boom (one heavy, low hit) · 3 crackling strike (long crackle, then a roll) · 4 giant (stays loud for 2 seconds, then slowly dies away) */
  /* Thunder is REAL: three public-domain field recordings of thunderstorms from Wikimedia Commons (Tonitrus.ogg, Rain and thunder.ogg,
     Thunder and rain on a v.ogg). Different parts of them are played, at slightly different speeds, so no two strikes sound the same.
     Only fetched when the storm sound is on. If a browser cannot play them, the built sound below is used instead. */
  var WXR='https://upload.wikimedia.org/wikipedia/commons/',wxRec=[{u:'c/c8/Tonitrus.ogg',g:.85,sh:0,fl:450},{u:'4/42/Rain_and_thunder.ogg',g:1,sh:7,fl:280},{u:'e/e7/Thunder_and_rain_on_a_v.ogg',g:1,sh:7,fl:280}],wxRecSt=0,wxLastClip=-1,
    /* [recording, the moment the clap begins, where that thunder has died away, deep, loudness] in seconds. Every clip starts exactly on its clap
       (so the sound lands with the flash) and stops where the thunder ends, before the recording's own rain and background take over. */
    wxClips=[[0,18.88,22.2,1,1],[0,16.72,22,1,2],[1,2.9,8.2,0,1],[2,7.05,10.3,0,1],[2,10.38,14.6,0,1],[2,7.05,14.6,0,1]],
    /* for the slow strikes: [recording, earliest start, the big clap, end]; the low rumble before the clap plays while the bolt grows */
    wxBuilds=[[2,4.55,7.2,10.3],[0,11.6,12.8,16.6]];
  var wxCeilC=null;function wxCeil(){if(!wxCeilC){wxCeilC=new Float32Array(2049);for(var i=0;i<2049;i++)wxCeilC[i]=Math.tanh((i-1024)/1024*2.2)*.94;}return wxCeilC;}
  function wxRecLoad(){if(wxRecSt||!AC)return;wxRecSt=1;var left=wxRec.length,ok=0;wxRec.forEach(function(r){fetch(WXR+r.u).then(function(x){if(!x.ok)throw 0;return x.arrayBuffer();}).then(function(ab){return new Promise(function(res,rej){AC.decodeAudioData(ab,res,rej);});})
    .then(function(b){r.b=b;ok++;},function(){}).then(function(){if(!--left)wxRecSt=ok?2:3;});});}
  function wxThunder(delay,vol,kind,len){if(!AC)return;len=len||3.5;wxRecLoad();
    if(wxRecSt===3)return wxThunderSynth(delay,vol,kind,len);
    var now=AC.currentTime,k,r,st,hit,end,cg=1,bright=false,rate;
    if(kind===5){var bl=wxBuilds.filter(function(q){return wxRec[q[0]].b;});if(!bl.length)return;k=bl[Math.random()*bl.length|0];r=wxRec[k[0]];rate=.9+Math.random()*.1;hit=Math.max(.3,(wxBuild||1.5)-.2);st=Math.max(k[1],k[2]-hit*rate);hit=(k[2]-st)/rate;end=k[3];}
    else{var c=[],i;for(i=0;i<wxClips.length;i++){var q=wxClips[i];if(!wxRec[q[0]].b||i===wxLastClip)continue;var D0=q[2]-q[1],sc=.5+Math.random();if(kind===2&&q[3])sc*=2.2;if(kind===0&&!q[3])sc*=1.7;if(len>4&&D0>5)sc*=1.6;if(len<2.5&&D0<4)sc*=1.5;c.push([sc,i]);}
      if(!c.length)return; /* still loading: stay quiet rather than play something that is not thunder */
      c.sort(function(a,b){return b[0]-a[0];});wxLastClip=c[0][1];k=wxClips[wxLastClip];r=wxRec[k[0]];cg=k[4];
      /* some strikes are the sharp, high, cracking kind: the same real claps, played brighter and a little faster */
      bright=!k[3]&&k[2]-k[1]<6&&kind!==2&&(kind===0?Math.random()<.85:Math.random()<.45);rate=bright?1.12+Math.random()*.16:.88+Math.random()*.14;st=k[1]-.04*rate;hit=.04;end=k[2];}
    /* the clap lands with the flash (a deep, far one a moment later), loud, then it rolls away slowly. As it fades the sound is made duller and duller,
       which is how thunder dies away and also takes out the rain and hiss that are in the recordings. */
    var t=now+(kind===2?.25:.05),dur=end-st,real=dur/rate,fo=Math.min(1.4,(real-hit)*.3),top=vol*r.g*cg*(bright?1.5:1)*1.7;
    var s=AC.createBufferSource();s.buffer=r.b;s.playbackRate.value=rate;var sh=AC.createBiquadFilter();sh.type=bright?'highshelf':'lowshelf';sh.frequency.value=bright?1200:140;sh.gain.value=bright?12:r.sh;
    var lp=AC.createBiquadFilter();lp.type='lowpass';lp.Q.value=.5;lp.frequency.setValueAtTime(hit>.2?260:(bright?14000:5000),t);if(hit>.2){lp.frequency.setValueAtTime(260,t+hit-.06);lp.frequency.exponentialRampToValueAtTime(5000,t+hit);}
    lp.frequency.exponentialRampToValueAtTime(bright?500:r.fl,t+hit+(real-hit)*.7);
    /* driven hard into a limiter and a soft ceiling so the clap is as loud as it can be without distorting; the fade comes after, so the quiet tail is never pumped up */
    var dr=AC.createGain();dr.gain.value=top;var cmp=AC.createDynamicsCompressor();cmp.threshold.value=-10;cmp.knee.value=6;cmp.ratio.value=6;cmp.attack.value=.003;cmp.release.value=.12;
    var pg=AC.createGain();pg.gain.value=.6;var ws=AC.createWaveShaper();ws.curve=wxCeil();
    var g=AC.createGain();g.gain.setValueAtTime(.0001,t);
    if(hit>.2){g.gain.linearRampToValueAtTime(.4,t+Math.min(.5,hit*.5));g.gain.setValueAtTime(.4,t+hit-.06);g.gain.linearRampToValueAtTime(1,t+hit);}else g.gain.linearRampToValueAtTime(1,t+.02);
    g.gain.setValueAtTime(1,t+hit+.6);g.gain.exponentialRampToValueAtTime(.14,t+real-fo);g.gain.linearRampToValueAtTime(.0001,t+real);
    s.connect(sh);sh.connect(lp);lp.connect(dr);dr.connect(cmp);cmp.connect(pg);/* same sound and bass, only quieter: the level is turned down after everything else */
    var soft=AC.createGain();soft.gain.value=.55;pg.connect(ws);ws.connect(g);g.connect(soft);soft.connect(wxOut());s.start(t,st,dur);
    /* the rain steps back while the thunder speaks, comes down a little harder after it, then settles */
    if(wxRainN)wxRainN.forEach(function(q){try{var base=RAINVOL*(wxMode==='storm'?1.3:1),p=q.g.gain;p.cancelScheduledValues(t+hit);p.setTargetAtTime(base*.45,t+hit,.12);p.setTargetAtTime(base*(1.25+Math.random()*.25),t+hit+2.2,1.3);p.setTargetAtTime(base,t+hit+6+Math.random()*3,2.5);}catch(e){}});}
  function wxThunderSynth(delay,vol,kind,len){if(!AC)return;len=len||3.5;var PRE=.5,POST=1.4,t=AC.currentTime+delay,out=AC.createGain();out.gain.value=vol*PRE;var cmp=AC.createDynamicsCompressor();cmp.threshold.value=-20;cmp.knee.value=12;cmp.ratio.value=8;cmp.attack.value=.004;cmp.release.value=.3;var post=AC.createGain();post.gain.value=POST;out.connect(cmp);cmp.connect(post);post.connect(wxOut());
    /* Real thunder is not a note, it is air tearing: many claps of plain noise arriving one after another from along the bolt,
       smeared by a long dull echo off the clouds and the ground. So there are no tones here at all (a falling tone is what a bass drum is). */
    var dry=AC.createGain();dry.gain.value=.5;dry.connect(out);var wet=AC.createGain();wet.gain.value=WETG;var cv=AC.createConvolver();cv.buffer=wxEcho();wet.connect(cv);cv.connect(out);
    function burst(buf,at,dur){var s=AC.createBufferSource();s.buffer=buf;s.loop=true;s.start(t+at,Math.random()*3);s.stop(t+at+dur+.15);return s;}
    function lp(f0,f1,at,dur){var f=AC.createBiquadFilter();f.type='lowpass';f.Q.value=.5;f.frequency.setValueAtTime(f0,t+at);f.frequency.exponentialRampToValueAtTime(Math.max(60,f1),t+at+dur);return f;}
    /* one clap: a burst of noise that starts fast, loses its brightness and dies away */
    function clap(at,amp,dec,f0,atk){at=Math.max(0,at);var s=burst(f0>700?wxWhite():wxBrown(),at,dec),a=lp(f0,f0*.22,at,dec),b=lp(f0*1.6,f0*.4,at,dec),g=AC.createGain(),a0=amp*(f0>700?.55:1.25);
      g.gain.setValueAtTime(.0001,t+at);g.gain.linearRampToValueAtTime(a0,t+at+atk);g.gain.exponentialRampToValueAtTime(a0*.3,t+at+atk+dec*.3);g.gain.exponentialRampToValueAtTime(.0001,t+at+dec);s.connect(a);a.connect(b);b.connect(g);g.connect(dry);g.connect(wet);}
    function scatter(from,to,n,ampF,f0,dLo,dHi){for(var i=0;i<n;i++){var k=Math.random(),at=from+(to-from)*k;clap(at,ampF(k)*(.5+.5*Math.random()),dLo+Math.random()*(dHi-dLo),f0*(.6+.8*Math.random()),.025+Math.random()*.06);}}
    /* the tearing, ripping start of a close strike: bright noise that flutters unevenly, never a click */
    function tear(at,dur,amp){var s=burst(wxWhite(),at,dur),f=AC.createBiquadFilter();f.type='bandpass';f.frequency.value=1300+Math.random()*700;f.Q.value=.5;var l=lp(3200,900,at,dur),g=AC.createGain(),N=Math.max(8,Math.round(dur*55)),c=new Float32Array(N);
      for(var i=0;i<N;i++){var k=i/(N-1);c[i]=amp*(.15+.85*Math.pow(Math.random(),1.6))*Math.min(1,k*8)*Math.pow(1-k,.8)+.0001;}c[0]=.0001;c[N-1]=.0001;g.gain.setValueAtTime(.0001,t+at);g.gain.setValueCurveAtTime(c,t+at+.005,dur);s.connect(f);f.connect(l);l.connect(g);g.connect(dry);g.connect(wet);}
    /* the deep rolling underneath: low noise that swells and sinks unevenly */
    function wander(n,lo){var pts=[],i;for(i=0;i<=n+1;i++)pts.push(lo+(1-lo)*Math.random());return function(k){var x=Math.max(0,Math.min(.9999,k))*n,j=x|0,f=x-j;f=f*f*(3-2*f);return pts[j]+(pts[j+1]-pts[j])*f;};}
    function roll(env,amp,f0){var D=len+1.5,s=burst(wxBrown(),0,D),a=lp(f0||170,55,0,D),b=lp((f0||170)*1.5,80,0,D),g=AC.createGain(),N=96,c=new Float32Array(N),w=wander(Math.round(D*2.4),.3),w2=wander(Math.round(D*6),.55);
      for(var i=0;i<N;i++){var k=i/(N-1);c[i]=Math.max(.0001,amp*env(k*D/len)*w(k)*w2(k));}c[N-1]=.0001;g.gain.setValueAtTime(.0001,t);g.gain.setValueCurveAtTime(c,t+.01,D);s.connect(a);a.connect(b);b.connect(g);g.connect(dry);g.connect(wet);}
    function fade(p){return function(k){return Math.pow(Math.max(0,1-k),p);};}
    function tail(from,p){return function(k){return k<from?1:Math.pow(Math.max(0,1-(k-from)/(1.25-from)),p);};}
    var n=Math.round(len);
    if(kind===0){tear(0,.28,.5);clap(0,1,.55,2300,.008);clap(.06+Math.random()*.05,.8,.8,900,.02);scatter(.15,len*.65,3+n,function(k){return .7*Math.pow(1-k,1.4);},480,.5,1.1);roll(function(k){return Math.min(1,k*30)*Math.exp(-k*2.6);},1.5);}
    else if(kind===1){var pk=.15+Math.random()*.2,hump=function(k){return k<pk?Math.pow(k/pk,1.4):Math.pow(Math.max(0,1-(k-pk)/(1.2-pk)),1.3);};
      scatter(0,len*.85,5+2*n,function(k){return .75*hump(k*.85);},400,.6,1.4);roll(hump,1.7);}
    else if(kind===2){clap(0,1,1.2,330,.05);clap(.1+Math.random()*.12,.85,1.5,250,.06);scatter(.3,len*.7,2+n,function(k){return .6*(1-k);},260,.8,1.6);roll(function(k){return Math.min(1,k*14)*Math.exp(-k*2);},1.9,130);}
    else if(kind===4){var hold=2/len;tear(0,.3,.5);clap(0,1,.55,2400,.008);scatter(.05,2,11,function(){return .8;},750,.35,.8);scatter(2,len*.9,3+n,function(k){return .6*Math.pow(1-k,1.4);},400,.6,1.3);roll(tail(hold,1.6),1.7);}
    else if(kind===5){var hit=Math.min(.5*len,wxBuild||1.5),kb=hit/len;
      scatter(0,hit*.9,3+Math.round(hit*3),function(k){return .06+.22*k*k;},360,.4,.9);tear(hit,.3,.5);clap(hit,1,.55,2300,.008);clap(hit+.07,.85,.8,900,.02);scatter(hit+.15,len*.9,4+n,function(k){return .7*Math.pow(1-k,1.4);},450,.6,1.3);
      roll(function(k){return k<kb?.25*Math.pow(k/kb,2):Math.pow(Math.max(0,1-(k-kb)/(1.25-kb)),1.6);},1.7);}
    else{var cr=Math.min(1.1,len*.35),h3=cr+.05;tear(0,cr,.4);scatter(0,cr,6,function(k){return .25+.3*k;},1300,.18,.4);clap(h3,1,.8,1500,.012);scatter(h3+.1,len*.9,4+n,function(k){return .7*Math.pow(1-k,1.3);},450,.6,1.2);
      roll(function(k){var c=h3/len;return k<c?.3*k/c:Math.pow(Math.max(0,1-(k-c)/(1.25-c)),1.5);},1.6);}}
  var wxIR=null,wxWN=null,wxBN=null,WETG=.9;
  function wxWhite(){return wxWN||(wxWN=noise(AC,4,false));}
  function wxBrown(){return wxBN||(wxBN=noise(AC,4,true));}
  /* the echo of open sky: 5 seconds of noise that gets duller and quieter, in uneven waves */
  function wxEcho(){if(wxIR)return wxIR;var sr=AC.sampleRate,L=Math.floor(sr*5),b=AC.createBuffer(2,L,sr),step=Math.floor(sr*.06);
    for(var c=0;c<2;c++){var d=b.getChannelData(c),l1=0,l2=0,r=1,rt=1;for(var i=0;i<L;i++){var tt=i/sr;if(i%step===0)rt=.35+Math.random()*1.1;r+=(rt-r)*.0008;
      var fc=2400*Math.exp(-tt*1.4)+130,a=1-Math.exp(-6.2832*fc/sr);l1+=a*((Math.random()*2-1)-l1);l2+=a*(l1-l2);d[i]=l2*Math.sqrt(2530/fc)*Math.exp(-tt/1.1)*r*Math.min(1,tt/.01)*Math.min(1,(5-tt)/.3);}}
    return (wxIR=b);}
  function wxAudio(){var on=wxSnd&&!wxMute&&!document.hidden&&(wxMode==='rain'||wxMode==='storm');if(on&&wxMode==='storm'&&AC)wxRecLoad();
    if(on&&!wxRainN&&AC){var src=AC.createBufferSource();src.buffer=rainBuf();src.loop=true;var hp=AC.createBiquadFilter();hp.type='highpass';hp.frequency.value=220;var lp=AC.createBiquadFilter();lp.type='lowpass';lp.frequency.value=5200;lp.Q.value=.3;var g=AC.createGain(),vol=RAINVOL*(wxMode==='storm'?1.3:1);g.gain.setValueAtTime(0,AC.currentTime);g.gain.linearRampToValueAtTime(vol,AC.currentTime+3);src.connect(hp);hp.connect(lp);lp.connect(g);g.connect(wxOut());src.start();wxRainN=[{s:src,g:g}];}
    else if(!on&&wxRainN){var n=wxRainN;wxRainN=null;n.forEach(function(q){try{q.g.gain.cancelScheduledValues(AC.currentTime);q.g.gain.setValueAtTime(q.g.gain.value,AC.currentTime);q.g.gain.linearRampToValueAtTime(0,AC.currentTime+.8);q.s.stop(AC.currentTime+.9);}catch(e){}});}
    var need=wxMode==='rain'||wxMode==='storm';if(need&&!wxBtn){wxBtn=document.createElement('button');wxBtn.type='button';wxBtn.className='wx-mute';wxBtn.addEventListener('click',function(){if(Date.now()-wxUnlockT<700){wxAudio();return;}wxMute=!wxMute;try{localStorage.setItem('nk_wxmute2',wxMute?'1':'0');}catch(e){}if(!wxMute){ac();wxSnd=!!AC;}wxAudio();});document.body.appendChild(wxBtn);wxSl=document.createElement('input');wxSl.type='range';wxSl.min='0';wxSl.max='1.6';wxSl.step='0.05';wxSl.value=String(wxVol);wxSl.className='wx-vol';wxSl.setAttribute('aria-label','Rain and thunder volume');wxSl.addEventListener('input',function(){wxVol=+wxSl.value;if(wxMaster)wxMaster.gain.setTargetAtTime(wxVol,AC.currentTime,.05);try{localStorage.setItem('nk_wxvol',String(wxVol));}catch(e){}});document.body.appendChild(wxSl);}
    if(wxSl)wxSl.hidden=!need||wxMute||!wxSnd;if(wxBtn){wxBtn.hidden=!need;wxBtn.textContent=wxMute?'Rain sound off':(wxSnd?'Rain sound on':'Tap for rain sound');wxBtn.setAttribute('aria-pressed',String(!wxMute));}}
  ['pointerdown','keydown','touchstart'].forEach(function(ev){addEventListener(ev,function(){if(wxSnd||wxMute||(wxMode!=='rain'&&wxMode!=='storm'))return;ac();wxSnd=!!AC;wxUnlockT=Date.now();wxAudio();},{passive:true});});
  document.addEventListener('visibilitychange',wxAudio);
  var wxSeqI=Math.random()*12|0;
  window.nkWxAmb=wxAmbient;window.nkWxStrike=function(){if(wxEl)wxStrike(performance.now());};
  function ambient(ph){if(!ns){ns=document.createElement('div');ns.id='nightsky';ns.setAttribute('aria-hidden','true');ns.innerHTML='<canvas></canvas><div class="moon"><canvas width="200" height="200"></canvas></div>';document.body.insertBefore(ns,document.body.firstChild);
      addEventListener('resize',function(){if(cur)paint(cur);});drawMoon(ns.querySelector('.moon canvas'),moonPhase());}
    if(ph!=='night'&&ph!=='dusk')dayClouds();
    if(ph==='sunset')sunsetClouds();
    if(ph==='night'||ph==='dusk')nightClouds();
    wxAmbient();
    if(ph===cur){if(ph==='sunset'||ph==='dawn')paint(ph);return;}cur=ph;paint(ph);var de=document.documentElement; /* during sunset the sky is painted again each time, so the sun keeps sinking */
    de.classList.remove('sky-dawn','sky-day','sky-sunset','sky-dusk','sky-night');de.classList.add('night-mood','sky-'+ph);}
  function night(force){ambient(force?'night':phase());}
  var pq=(location.search.match(/[?&]sky=(\w+)/)||[])[1];
  ambient(/^(dawn|day|sunset|dusk|night)$/.test(pq||'')?pq:phase());
  if(!pq)setInterval(function(){if(!document.hidden)ambient(phase());},20000); /* every 20 seconds, so the sun can be watched rising and setting */
  document.addEventListener('visibilitychange',function(){if(!document.hidden&&!pq)ambient(phase());});
  var q=(location.search.match(/[?&]fx=(\w+)/)||[])[1];
  if(q==='night')ambient('night');
  if(q==='dusk'||q==='dawn')setTimeout(function(){sky(q);},900);if(q==='thunder')setTimeout(thunder,900);if(q==='rain')setTimeout(rain,900);if(q==='sunny')setTimeout(sunny,900);if(q==='partly')setTimeout(partly,900);if(q==='cloudy')setTimeout(cloudy,900);
  window.nkFx={play:function(c,d){playCode(c,d);},sky:sky,thunder:thunder,rain:rain,night:night,sunny:sunny,partly:partly,cloudy:cloudy};
})();

}catch(e){console.error("[nikadi part 1]",e);}
/* part 2 */
try{

/* the moon game lives in /moon.js and is only downloaded when someone taps the moon (desktop) */
(function(){var h=document.getElementById('moonHit'),bx=document.getElementById('moonX');if(!h||!bx)return;var ld=false;
  function go(){if(ld)return;ld=true;window.__mwAuto=1;bx.hidden=false;document.getElementById('mwLoad').hidden=false;document.documentElement.style.overflow='hidden';var s=document.createElement('script');s.src='/moon.js?v=1';s.onerror=function(){ld=false;bx.hidden=true;document.documentElement.style.overflow='';};document.head.appendChild(s);}
  h.addEventListener('click',go);if(/[?&]moonwalk=1/.test(location.search))setTimeout(go,400);})();

}catch(e){console.error("[nikadi part 2]",e);}
/* part 3 */
try{
function nkPh(v){var s=String(v||'').trim(),d=s.replace(/\D/g,'');if(!d)return '';var i=/^(\+|00)/.test(s);if(i&&s.charAt(0)==='0')d=d.slice(2);if(i){if(d.indexOf('91')===0&&/^[6-9]\d{9}$/.test(d.slice(2)))return d.slice(2);return d.length>=8&&d.length<=15&&d.indexOf('91')!==0?d:'';}if(d.length===12&&d.indexOf('91')===0)d=d.slice(2);if(d.length===11&&d.charAt(0)==='0')d=d.slice(1);if(/^[6-9]\d{9}$/.test(d))return d;return d.length>=11&&d.length<=15&&d.charAt(0)!=='0'&&d.indexOf('91')!==0?d:'';}
}catch(e){console.error("[nikadi part 3]",e);}
/* part 4 */
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
    $('ocFoot').textContent=pct?'Your '+m.tier+' discount of '+pct+'% is already taken off'+(offer?' the offer price.':'.'):(offer?'Per room, per night. Fridays and Saturdays ₹500 more. Members pay even less.':'Per room, per night. Members save 5–20% on every night.'); }
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

}catch(e){console.error("[nikadi part 4]",e);}
/* part 5 */
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
      $('poHint').textContent=nkT('50% advance for {0} in {1} (from the booking bar above) is ₹{2}. Please pay after we confirm your room on WhatsApp.').replace('{0}',nkT(q.nights+(q.nights>1?' nights':' night'))).replace('{1}',k+' × '+rm.options[rm.selectedIndex].text).replace('{2}',Math.ceil(q.total/2).toLocaleString('en-IN'));
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

}catch(e){console.error("[nikadi part 5]",e);}
/* part 6 */
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
    var h=n+(n>1?' nights':' night')+' · '+k+' × '+opt.text+(nkLang()==='en'?(k>1?' rooms':' room'):'')+' · ';
    if(q.offer<q.standard)h+='<s>'+fmt(q.standard)+'</s> ';
    h+='<b>'+fmt(q.offer)+'</b>'+(q.offerName?' '+q.offerName.toLowerCase():'');
    if(mem&&mem.discount)h+=' · your '+mem.tier+' price <b>'+fmt(q.total)+'</b>';
    if(k>1)h+=' (max 3 guests per room)';
    sum.innerHTML=h+'.';
  }
  window.nkBarUpdate=update;
  [ci,co,rm,gu].forEach(function(el){el.addEventListener('change',update);});
  update();
  /* "Check availability" takes the guest to the live calendar, with their room type and dates already marked there.
     The calendar's "Book these dates" button then sends the WhatsApp request. (On pages without the calendar the button sends it directly, as before.) */
  document.getElementById('bookForm').addEventListener('submit',function(e){
    e.preventDefault();
    if(window.nkAvc){var n0=nights();window.nkAvc.show(rm.selectedIndex===2?'Large Twin':rm.selectedIndex===1?'Deluxe Twin':'Deluxe Double',n0>=1?ci.value:null,n0>=1?co.value:null);return;}
    sendWA();
  });
  function sendWA(){if(window.nkTrack)window.nkTrack('book');
    var n=nights();if(n<1){update();return;}
    var txt='Hare Krishna! I would like to book at Nikadi Guest House.\n\nRoom: '+rm.value+'\nCheck-in: '+pretty(ci.value)+'\nCheck-out: '+pretty(co.value)+' ('+n+(n>1?' nights':' night')+')\nGuests: '+gu.value+'\nRooms: '+roomsFor(gu.value)+'\n\nIs it available?';
    var a=document.createElement('a');a.href='https://wa.me/'+WA+'?text='+encodeURIComponent(txt);a.target='_blank';a.rel='noopener';document.body.appendChild(a);a.click();a.remove();
  }
  window.nkBookWA=sendWA;
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

}catch(e){console.error("[nikadi part 6]",e);}
/* part 7 */
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

}catch(e){console.error("[nikadi part 7]",e);}
/* part 8 */
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

}catch(e){console.error("[nikadi part 8]",e);}
/* part 9 */
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

}catch(e){console.error("[nikadi part 9]",e);}
/* part 10 */
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

}catch(e){console.error("[nikadi part 10]",e);}
/* part 11 */
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
    /* the big photo is fetched only when the room's page is actually opened, not on every visit to the home page */
    var first=function(){var u=img.getAttribute('data-src');if(u){img.removeAttribute('data-src');img.src=u;}};
    var sh0=g.closest('.sheet');if(!sh0||!sh0.hidden||!('MutationObserver' in window))first();else{var o=new MutationObserver(function(){if(!sh0.hidden){first();o.disconnect();}});o.observe(sh0,{attributes:true,attributeFilter:['hidden']});}
  });
})();

}catch(e){console.error("[nikadi part 11]",e);}
/* part 12 */
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
    function checkMore(){tr.querySelectorAll('.rev').forEach(function(r){var p=r.querySelector('p'),b=r.querySelector('.rev-more');if(b&&p&&!r.classList.contains('open'))b.hidden=p.scrollHeight<=p.clientHeight+2;});}
    tr.addEventListener('click',function(e){var b=e.target.closest('.rev-more');if(!b)return;var r=b.closest('.rev');r.classList.toggle('open');b.textContent=r.classList.contains('open')?'Show less':'Read more';});
    window.addEventListener('load',checkMore);window.addEventListener('resize',checkMore);setTimeout(checkMore,300);
  }

  /* clock + desk status */
  function tick(){
    var d=ist(),h=d.getUTCHours(),m=d.getUTCMinutes(),now=h*60+m;
    if($('gClock'))$('gClock').innerHTML=(h%12||12)+':'+pad(m)+'<small>'+(h<12?'AM':'PM')+'</small>';
    var days=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],mon=['January','February','March','April','May','June','July','August','September','October','November','December'];
    if($('gDate'))$('gDate').textContent=(nkFmt(d,{weekday:'long',day:'numeric',month:'long'})||(days[d.getUTCDay()]+', '+d.getUTCDate()+' '+mon[d.getUTCMonth()]))+' · India time';
    var p=$('gDesk');if(p){
      if(now<9*60){p.textContent='Check-out by 9:00 AM · in '+dur(9*60-now);p.className='pill';}
      else if(now<11*60){p.textContent='Check-in opens at 11:00 AM · in '+dur(11*60-now);p.className='pill';}
      else if(now<22*60){p.textContent='Check-in is open now · from 11:00 AM';p.className='pill ok';}
      else{p.innerHTML='<a href="https://wa.me/917501101137?text='+encodeURIComponent('Hare Krishna! I have a booking at Nikadi Guest House and will arrive late tonight. My name: ')+'" target="_blank" rel="noopener">'+nkT('Arriving late tonight? WhatsApp us before you come')+' ›</a>';p.className='pill pill-link';}
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
  var WXD=null,WXH=null;
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
    /* hour by hour, for the chosen day */
    var now=ist(),key=now.getUTCFullYear()+'-'+pad(now.getUTCMonth()+1)+'-'+pad(now.getUTCDate())+'T'+pad(now.getUTCHours())+':00';
    var i0=hr.time.indexOf(key);if(i0<0)i0=0;
    var dnS=nkNames('d','short',['Sun','Mon','Tue','Wed','Thu','Fri','Sat']);
    function dayName(d){var dd=new Date(dl.time[d]+'T00:00:00Z');return d===0?nkT('Today'):d===1?nkT('Tomorrow'):dnS[dd.getUTCDay()];}
    function hours(d){var from,to;if(d===0){from=i0;to=Math.min(i0+24,hr.time.length);}else{from=hr.time.indexOf(dl.time[d]+'T00:00');if(from<0)return;to=Math.min(from+24,hr.time.length);}
      var hh='',pts=[],lo=99,hi=-99;
      for(var i=from;i<to;i++){var H=+hr.time[i].slice(11,13),tt=hr.temperature_2m[i],rp=hr.precipitation_probability[i];lo=Math.min(lo,tt);hi=Math.max(hi,tt);pts.push(tt);var day=H>=6&&H<18;
        hh+='<button type="button" class="wx-hr'+(d===0&&i===i0?' now':'')+'" data-c="'+hr.weather_code[i]+'" data-day="'+(day?1:0)+'" aria-label="'+((H%12||12)+(H<12?' AM':' PM'))+', '+(WX[hr.weather_code[i]]||'')+', '+Math.round(tt)+'°"><span>'+(d===0&&i===i0?nkT('Now'):((H%12||12)+(H<12?' AM':' PM')))+'</span>'+wxIcon(hr.weather_code[i],day)+'<b>'+Math.round(tt)+'°</b><span class="rp">'+(rp?rp+'%':'&nbsp;')+'</span></button>';}
      $('wxHours').innerHTML=hh;$('wxHours').scrollLeft=0;
      $('wxHrH').textContent=d===0?nkT('Next 24 hours'):dayName(d)+' · '+nkT('hour by hour');
      [].forEach.call($('wxTabs').children,function(b,k){b.setAttribute('aria-selected',k===d?'true':'false');});
      [].forEach.call($('wxDays').children,function(b,k){b.classList.toggle('sel',k===d);});
      var n=pts.length,sv='',span=Math.max(hi-lo,1),pth='';
      pts.forEach(function(v,k){var x=(k/(n-1||1))*580+10,y=100-((v-lo)/span)*72;pth+=(k?'L':'M')+x.toFixed(1)+' '+y.toFixed(1);});
      sv='<defs><linearGradient id="wxg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d9ad55" stop-opacity=".35"/><stop offset="1" stop-color="#d9ad55" stop-opacity="0"/></linearGradient></defs>';
      sv+='<path d="'+pth+' L590 118 L10 118 Z" fill="url(#wxg)"/><path d="'+pth+'" fill="none" stroke="#f4d797" stroke-width="2.2" vector-effect="non-scaling-stroke"/>';
      $('wxChart').innerHTML=sv;if($('wxChartL'))$('wxChartL').textContent=(d===0?'Temperature next 24 hours':d===1?'Temperature tomorrow':'Temperature on '+dayName(d))+' · high '+Math.round(hi)+'°, low '+Math.round(lo)+'°';}
    var tb='';for(var q=0;q<dl.time.length;q++)tb+='<button type="button" role="tab" data-wd="'+q+'">'+dayName(q)+'</button>';$('wxTabs').innerHTML=tb;
    WXH=hours;
    /* 7 days */
    var dn=nkNames('d','short',['Sun','Mon','Tue','Wed','Thu','Fri','Sat']),mn=nkNames('m','short',['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']);
    var L=Math.min.apply(null,dl.temperature_2m_min),U=Math.max.apply(null,dl.temperature_2m_max),R=Math.max(U-L,1),dh='';
    for(var d=0;d<dl.time.length;d++){
      var dd=new Date(dl.time[d]+'T00:00:00Z'),mi=dl.temperature_2m_min[d],ma=dl.temperature_2m_max[d];
      var sr=hm(dl.sunrise[d]),ss=hm(dl.sunset[d]);
      dh+='<button type="button" class="wx-day" data-wd="'+d+'" data-c="'+dl.weather_code[d]+'"><span class="d">'+(d===0?'Today':d===1?'Tomorrow':dn[dd.getUTCDay()])+'<small>'+(nkFmt(dd,{day:'numeric',month:'short'})||(dd.getUTCDate()+' '+mn[dd.getUTCMonth()]))+'</small></span>'+wxIcon(dl.weather_code[d],1)+'<span class="cn">'+(WX[dl.weather_code[d]]||'')+'<small>Sun '+t12(sr[0],sr[1])+' – '+t12(ss[0],ss[1])+'</small></span><span class="wx-rng"><span>'+Math.round(mi)+'°</span><i><em style="left:'+((mi-L)/R*100).toFixed(0)+'%;right:'+((U-ma)/R*100).toFixed(0)+'%"></em></i><span>'+Math.round(ma)+'°</span></span><span class="rp">'+(dl.precipitation_probability_max[d]||0)+'% rain</span></button>';
    }
    $('wxDays').innerHTML=dh;hours(0);
    $('wxUpd').textContent='Right now in Mayapur, updated at '+t12(now.getUTCHours(),now.getUTCMinutes())+' India time.';
  }
  function wxLoad(){
    return fetch('https://api.open-meteo.com/v1/forecast?latitude='+LAT+'&longitude='+LNG+'&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,is_day&hourly=temperature_2m,weather_code,precipitation_probability&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,uv_index_max,sunrise,sunset&timezone=Asia%2FKolkata&forecast_days=7')
    .then(function(r){return r.json();}).then(function(w){
      WXD=w;window.NK_WX=w;if(window.nkWxAmb)nkWxAmb();
      var c=w.current,dl=w.daily;
      $('gTemp').innerHTML=Math.round(c.temperature_2m)+'°<small>'+(WX[c.weather_code]||'')+'</small>';
      $('gWxSub').textContent='Humidity '+c.relative_humidity_2m+'% · today '+Math.round(dl.temperature_2m_min[0])+'° to '+Math.round(dl.temperature_2m_max[0])+'°'+(dl.precipitation_probability_max[0]!=null?' · rain '+dl.precipitation_probability_max[0]+'%':'');
      var dn=nkNames('d','short',['Sun','Mon','Tue','Wed','Thu','Fri','Sat']),h='';
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
    var wsh=document.getElementById('weather');if(wsh)wsh.addEventListener('click',function(e){
      var t=e.target.closest('[data-wd]');if(t&&WXH){var d=+t.getAttribute('data-wd');WXH(d);if(t.classList.contains('wx-day')){var h=document.getElementById('wxHrH');if(h)h.scrollIntoView({behavior:'smooth',block:'start'});if(window.nkFx)nkFx.play(+t.getAttribute('data-c'),true);}return;}
      var b=e.target.closest('.wx-hr');if(b){[].forEach.call(b.parentNode.children,function(x){x.classList.toggle('sel',x===b);});if(window.nkFx)nkFx.play(+b.getAttribute('data-c'),b.getAttribute('data-day')==='1');}});
  }

  /* tonight's price (from pricing.js). After 6 pm the front desk may send tonight's late price: then this card shows it, with the usual price struck through. */
  var R=window.NikadiRates;
  window.nkTonight=function(){
    if(!R||!$('gPrD'))return;
    var td=R.today(),P=R.period(td),inr=function(n){return '₹'+Number(n).toLocaleString('en-IN');},dl=R.deal&&R.deal();
    $('gPrD').textContent=inr(R.rate('double',td));$('gPrT').textContent=inr(R.rate('twin',td));
    if(dl&&R.usual('double',td)>R.rate('double',td)){$('gPrDs').textContent=inr(R.usual('double',td));$('gPrTs').textContent=inr(R.usual('twin',td));$('gPrLbl').textContent="Tonight only · late evening price";}
    else{if(R.standard('double')>R.rate('double',td)){$('gPrDs').textContent=inr(R.standard('double'));$('gPrTs').textContent=inr(R.standard('twin'));}
      if(P.offer)$('gPrLbl').textContent="Tonight's price · "+P.offer.name;}
  };
  nkTonight();

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


}catch(e){console.error("[nikadi part 12]",e);}
/* part 13 */
try{

/* ---- v4: temple program (live next arati) + Instagram darshan embeds ---- */
(function(){
  function $(id){return document.getElementById(id);}
  var rows=[].slice.call(document.querySelectorAll('#prog li'));
  var CL=rows.filter(function(li){return li.classList.contains('closed');});rows=rows.filter(function(li){return !li.classList.contains('closed');});
  var P=rows.map(function(li){var t=li.getAttribute('data-t').split(':');return {li:li,m:+t[0]*60+(+t[1]),get name(){return li.querySelector('.nm').textContent;},time:li.querySelector('.tm').textContent.replace(/\s+/g,' ').trim()};});
  /* same timings as the list on the Temple page (keep both in step) */
  if(!P.length)P=[['04:30','Mangal Arati'],['07:00','Darshan Arati'],['08:00','Bhagavatam Lecture'],['08:30','Dhupa Arati'],['11:45','Bhoga Offering'],['12:00','Bhoga Arati'],['16:00','Dhupa Arati'],['18:00','Sandhya Arati'],['19:30','Bhagavad Gita Lecture'],['20:15','Shayan Arati']].map(function(x){var t=x[0].split(':'),h=+t[0];
    return {li:null,m:h*60+(+t[1]),n:x[1],get name(){return nkT(this.n);},time:(h%12||12)+':'+t[1]+(h<12?' AM':' PM')};});
  var dummy={classList:{toggle:function(){}}};P.forEach(function(p){if(!p.li)p.li=dummy;});
  function dur(min){var h=Math.floor(min/60),m=min%60;return h?(h+' h'+(m?' '+m+' min':'')):m+' min';}
  function at(n,t){return nkT('{0} at {1}').replace('{0}',n).replace('{1}',t);}
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
    if(live){live.hidden=!cur;if(cur){$('progLiveName').textContent=cur.name;$('progLiveSub').textContent=nkT('Going on now')+' · '+nkT('started at {0}').replace('{0}',cur.time)+(next&&!tomorrow?' · '+at(next.name,next.time):'');}}
    var head,sub;
    if(shutDay||shutNight){
      head=shutDay?'Temple closed now':'Temple closed for the night';
      sub=(shutDay?nkT('All temples in Mayapur close 1–4 PM.')+' ':'')+nkT('Opens again with {0} at {1}').replace('{0}',next.name).replace('{1}',next.time)+' · '+nkT('in '+dur(inMin));
      if($('progNext')){$('progNext').textContent=head;$('progIn').textContent=sub;$('progNow').querySelector('.lbl').textContent='Temple timings';$('progNow').classList.add('shut');}
      if($('gArati')){if($('gAratiLbl'))$('gAratiLbl').textContent='Next at the temple';$('gArati').textContent=head;$('gAratiIn').textContent=nkT('Opens {1} ({0})').replace('{0}',next.name).replace('{1}',next.time)+' · '+nkT('in '+dur(inMin));}
      return;
    }
    if($('progNow'))$('progNow').classList.remove('shut');
    head=next.name+' · '+next.time;sub=(tomorrow?'Tomorrow morning · in ':'In ')+dur(inMin);
    if($('progNext')){$('progNext').textContent=head;$('progIn').textContent=sub;$('progNow').querySelector('.lbl').textContent=tomorrow?'First program tomorrow':'Next at the temple';}
    if($('gArati')){if($('gAratiLbl'))$('gAratiLbl').textContent=cur?'At the temple now':'Next at the temple';$('gArati').textContent=cur?cur.name:next.name;$('gAratiIn').innerHTML=cur?'<span class="pill live" style="display:inline-block;margin-right:6px">'+nkT('● Live now')+'</span>'+nkT('Next: {0}').replace('{0}',at(next.name,next.time)):next.time+' · '+(tomorrow?'tomorrow, in ':'in ')+dur(inMin);}
  }
  upd();setInterval(upd,30000);document.addEventListener('nk:lang',upd);

  /* Instagram's own embed script, loaded only when the darshan row comes near the screen */
  var box=$('igs');
  if(box){
    var go=function(){if(window.__igl)return;window.__igl=1;var sc=document.createElement('script');sc.async=true;sc.src='https://www.instagram.com/embed.js';sc.onload=function(){try{window.instgrm&&window.instgrm.Embeds.process();}catch(e){}};document.body.appendChild(sc);};
    if('IntersectionObserver' in window){var io=new IntersectionObserver(function(es){if(es.some(function(e){return e.isIntersecting;})){go();io.disconnect();}},{rootMargin:'600px 0px'});io.observe(box);}else go();
  }
})();


}catch(e){console.error("[nikadi part 13]",e);}
/* part 14 */
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


}catch(e){console.error("[nikadi part 14]",e);}
/* part 15 */
try{

(function(){var r=document.getElementById('qrail');if(!r)return;var t=r.querySelector('.qr-toggle');
t.addEventListener('click',function(){var o=r.classList.toggle('open');t.setAttribute('aria-expanded',o?'true':'false');});
r.addEventListener('click',function(e){if(e.target.closest('.qr'))r.classList.remove('open');});
document.addEventListener('click',function(e){if(!e.target.closest('#qrail'))r.classList.remove('open');});})();

}catch(e){console.error("[nikadi part 15]",e);}
/* part 16 */
try{

/* transport: tabs + live next trains */
(function(){
  var sec=document.getElementById('transport'); if(!sec) return;
  var tabs=sec.querySelectorAll('[data-tp]'), panes=sec.querySelectorAll('[data-pane]');
  function show(k){tabs.forEach(function(t){t.setAttribute('aria-selected',t.getAttribute('data-tp')===k?'true':'false');});panes.forEach(function(p){p.hidden=p.getAttribute('data-pane')!==k;});}
  tabs.forEach(function(t){t.addEventListener('click',function(){show(t.getAttribute('data-tp'));});});
  if(location.hash==='#trains')show('train');
  sec.addEventListener('click',function(e){var g=e.target.closest('[data-tpgo]');if(!g)return;show(g.getAttribute('data-tpgo'));var tb=sec.querySelector('.tp-tabs');if(tb)tb.scrollIntoView({behavior:'smooth',block:'start'});});
  try{var go=sessionStorage.getItem('nk_tp');if(go){sessionStorage.removeItem('nk_tp');show(go);}}catch(e){}
  function mins(t){var a=t.split(':');return +a[0]*60+(+a[1]);}
  function t12(t){var a=t.split(':'),h=+a[0];return (h%12||12)+':'+a[1]+(h<12?' AM':' PM');}
  function T_(x){return window.nkT?nkT(x):x;}
  function upd(){
    var d=new Date(Date.now()+330*60000),now=d.getUTCHours()*60+d.getUTCMinutes();
    sec.querySelectorAll('.nxt').forEach(function(box){
      var dd=box.closest('.dir'),list=dd.querySelectorAll('.tr'),up=[];
      var wd=d.getUTCDay();list.forEach(function(li){var ds=li.getAttribute('data-days')||'Daily',runs=ds==='Daily'||(ds.indexOf('only')>0?wd===0:wd!==0);li.classList.toggle('off',!runs);var m=mins(li.getAttribute('data-d'));li.classList.toggle('gone',false);li._gone=m<now;li.classList.remove('soon');if(m>=now&&runs)up.push(li);});
      var tomorrow=false; if(!up.length){up=[].slice.call(list).filter(function(li){return (li.getAttribute('data-days')||'Daily')==='Daily';});tomorrow=true;}
      if(!tomorrow)list.forEach(function(li){li.classList.toggle('gone',li._gone);});
      up=up.slice(0,3); if(up[0])up[0].classList.add('soon');
      var sm=dd.querySelector('.dl small');if(sm&&up[0]){var m0=mins(up[0].getAttribute('data-d')),i0=tomorrow?(24*60-now+m0):(m0-now),h0=Math.floor(i0/60);sm.textContent='Next train · '+t12(up[0].getAttribute('data-d'))+(tomorrow?' · '+T_('tomorrow'):' · '+(i0<1?T_('now'):T_('in '+(h0?h0+' h':'')+(i0%60?(h0?' ':'')+(i0%60)+' min':''))))+' · '+list.length+' trains';}
      box.innerHTML='<span class="nl">Next trains'+(tomorrow?' · tomorrow':'')+'</span>'+up.map(function(li){var m=mins(li.getAttribute('data-d')),inm=tomorrow?(24*60-now+m):(m-now),h=Math.floor(inm/60);return '<span class="nc'+(li.classList.contains('ac')?' ac':'')+'"><b>'+t12(li.getAttribute('data-d'))+'</b>'+(li.classList.contains('ac')?' AC':'')+' <small>'+(inm<1?'now':'in '+(h?h+' h':'')+(inm%60?(h?' ':'')+(inm%60)+' min':''))+'</small></span>';}).join('');
    });
  }
  upd(); setInterval(upd,30000);
})();

}catch(e){console.error("[nikadi part 16]",e);}
/* part 17 */
try{

(function(){
  var sk=[].slice.call(document.querySelectorAll('#transport .dir'))[0]; if(!document.getElementById('gTrain'))return;
  function mins(t){var a=t.split(':');return +a[0]*60+(+a[1]);}
  function t12(t){var a=t.split(':'),h=+a[0];return (h%12||12)+':'+a[1]+(h<12?' AM':' PM');}
  function dur(m){var h=Math.floor(m/60),r=m%60;return m<1?'a moment':(h?h+' h':'')+(r?(h?' ':'')+r+' min':'');}
  function upd(){
    var d=new Date(Date.now()+330*60000),now=d.getUTCHours()*60+d.getUTCMinutes();
    var wd=d.getUTCDay(),runs=function(ds){ds=ds||'Daily';return ds==='Daily'||(ds.indexOf('only')>0?wd===0:wd!==0);},rows;
    if(sk)rows=[].slice.call(sk.querySelectorAll('.tr')).filter(function(li){return runs(li.getAttribute('data-days'));}).map(function(li){return {t:li.getAttribute('data-d'),ac:li.classList.contains('ac'),arr:li.querySelector('span').textContent.replace('→ ','')};});
    else{var T=window.NK_TRAINS||{};rows=Object.keys(T).filter(function(k){return T[k].k==='sk'&&runs(T[k].d);}).map(function(k){var s=T[k].s;return {t:s[0][1],ac:T[k].t==='AC',arr:t12(s[s.length-1][1])};}).sort(function(a,b){return mins(a.t)-mins(b.t);});}
    if(!rows.length)return;
    var nx=rows.filter(function(r){return mins(r.t)>=now;}),tm=!nx.length; if(tm)nx=rows;
    var n=nx[0],inm=tm?24*60-now+mins(n.t):mins(n.t)-now;
    document.getElementById('gTrain').textContent=t12(n.t)+(n.ac?' AC':'');
    document.getElementById('gTrainIn').textContent=nkT('Sealdah')+' → '+nkT('Krishnanagar')+' · '+nkT((tm?'tomorrow, ':'')+'in '+dur(inm))+' · '+nkT('arrives '+n.arr);
    var more=nx.slice(1,3);if(document.getElementById('gTrainMore'))document.getElementById('gTrainMore').textContent=more.length?nkT('Then')+': '+more.map(function(r){return t12(r.t)+(r.ac?' AC':'');}).join(' · '):'';
    var ac=nx.filter(function(r){return r.ac;})[0];
    document.getElementById('gTrainAc').textContent=nkT(ac&&ac!==n?'Next AC local: '+t12(ac.t)+' (arrives '+ac.arr+')':(n.ac?'This one is the AC local':'No more AC locals today'));
  }
  /* the timetable data is defined further down, so start once the page has loaded */
  setTimeout(upd,0);setInterval(upd,30000);document.addEventListener('nk:lang',upd);
  document.querySelectorAll('[data-tp-go]').forEach(function(a){a.addEventListener('click',function(){var b=document.querySelector('#transport [data-tp="'+a.getAttribute('data-tp-go')+'"]');if(b)b.click();else try{sessionStorage.setItem('nk_tp',a.getAttribute('data-tp-go'));}catch(e){}});});
})();

}catch(e){console.error("[nikadi part 17]",e);}
/* part 18 */
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
    var bk=document.getElementById('trBook'),ex=T.t==='EXP';bk.hidden=!ex;document.getElementById('trFull').className='btn '+(ex?'btn-line':'btn-gold');if(ex)bk.href='https://wa.me/919933864574?text='+encodeURIComponent('Hare Krishna! Please book '+T.n+' (No. '+n+') for me.\nFrom: '+st[0][0]+'\nTo: '+st[st.length-1][0]+'\nDate: \nPassengers: \nClass: ');
    dlg.hidden=false; document.documentElement.style.overflow='hidden'; dlg.querySelector('.trd-x').focus();
  }
  function close(){dlg.hidden=true;document.documentElement.style.overflow='';if(last&&last.focus)last.focus();}
  document.addEventListener('click',function(e){var b=e.target.closest('.trb');if(b){open(b.closest('li'));}});
  dlg.addEventListener('click',function(e){if(e.target===dlg||e.target.closest('.trd-x'))close();});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!dlg.hidden)close();});
})();

}catch(e){console.error("[nikadi part 18]",e);}
/* part 19 */
try{

(function(){var f=document.getElementById('gtForm');if(!f)return;
try{f.elements.dt.min=new Date(Date.now()+330*60000).toISOString().slice(0,10);}catch(e){}
f.addEventListener('submit',function(e){e.preventDefault();var x=f.elements,L=['Hare Krishna! Travel booking request for Nikadi × Gourdham Travels','Name: '+x.nm.value.trim(),'Book: '+x.w.value];
if(x.fr.value.trim())L.push('From: '+x.fr.value.trim());if(x.to.value.trim())L.push('To: '+x.to.value.trim());if(x.dt.value)L.push('Date: '+x.dt.value);L.push('Travellers: '+x.px.value);if(x.m.value.trim())L.push(x.m.value.trim());
window.open('https://wa.me/919933864574?text='+encodeURIComponent(L.join('\n')),'_blank','noopener');});})();

}catch(e){console.error("[nikadi part 19]",e);}
/* part 20 */
try{

(function(){var v=document.getElementById('mvidV'),b=document.getElementById('mvidS');if(!v||!b)return;
v.muted=true;
function play(){var p=v.play();if(p&&p.catch)p.catch(function(){});}
if('IntersectionObserver' in window){new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting&&e.intersectionRatio>.35)play();else v.pause();});},{threshold:[0,.35,.6]}).observe(v);}else play();
document.addEventListener('visibilitychange',function(){if(document.hidden)v.pause();});
b.addEventListener('click',function(){var on=v.muted;v.muted=!on;if(on){v.volume=1;play();}b.setAttribute('aria-pressed',on?'true':'false');b.setAttribute('aria-label',on?'Turn sound off':'Turn sound on');b.querySelector('span').textContent=on?'Sound off':'Sound on';});
})();

}catch(e){console.error("[nikadi part 20]",e);}
/* part 21 */
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

}catch(e){console.error("[nikadi part 21]",e);}
/* part 22 */
try{

/* phones: Instagram's frames swallow sideways swipes, so a clear layer on top lets the row scroll; a tap still opens the post */
(function(){var row=document.getElementById('meetIg');if(!row)return;
row.querySelectorAll('.igc').forEach(function(c){var q=c.querySelector('[data-instgrm-permalink]'),f=c.querySelector('iframe'),h=q?q.getAttribute('data-instgrm-permalink'):f?f.src.replace(/embed.*$/,''):'';if(!h)return;var t=document.createElement('a');t.className='igc-tap';t.href=h.split('?')[0];t.target='_blank';t.rel='noopener';t.setAttribute('aria-label','Open this post on Instagram');c.appendChild(t);});
})();

}catch(e){console.error("[nikadi part 22]",e);}
/* part 23 */
try{

/* ---- v6: live availability calendar (free / few / full from the front desk, prices from pricing.js) ---- */
(function(){
  var box=document.getElementById('avc');if(!box)return;
  var API="https://ebwdrqdsexjterbxyeoa.supabase.co/functions/v1/api",R=window.NikadiRates;
  function $(id){return document.getElementById(id);}
  function pad(n){return (n<10?'0':'')+n;}
  function ymd(y,m,d){var x=new Date(Date.UTC(y,m,d));return x.getUTCFullYear()+'-'+pad(x.getUTCMonth()+1)+'-'+pad(x.getUTCDate());}
  function addDay(s,n){var p=s.split('-');return ymd(+p[0],+p[1]-1,+p[2]+n);}
  var MN=['January','February','March','April','May','June','July','August','September','October','November','December'],WD=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],WDL=nkNames('d','short',null);
  var today=R?R.today():new Date(Date.now()+330*60000).toISOString().slice(0,10);
  var ty=+today.slice(0,4),tm=+today.slice(5,7)-1,off=0,MAXOFF=5,type='Deluxe Double',AV=null,ci=null,co=null,state='loading';
  function stat(d){
    if(!AV)return '';var row=AV[d];if(!row)return '';
    var re=type==='Large Twin'?/large/i:type==='Deluxe Twin'?/^(?!.*large).*twin/i:/double/i,best='';
    Object.keys(row).forEach(function(k){if(!re.test(k))return;var v=row[k];if(v==='free'||(v==='few'&&best!=='free')||(v==='full'&&!best))best=v;else if(!best)best=v;});
    return best;
  }
  /* Demand shading until the end of March: Fridays, Saturdays and festival days are our busiest nights,
     Sundays fill up, midweek is usually free. Live front-desk status, when the server sends it, always wins. */
  var DEMAND_UNTIL='2027-03-31';
  function hsh(d){var h=2166136261;for(var i=0;i<d.length;i++){h^=d.charCodeAt(i);h=Math.imul(h,16777619);}return ((h>>>0)%1000)/1000;}
  function demand(d){if(d>DEMAND_UNTIL)return '';var p=d.split('-'),w=new Date(Date.UTC(+p[0],+p[1]-1,+p[2])).getUTCDay(),h=hsh(d+type);
    var fest=(window.NK_CAL||[]).some(function(x){return x.big&&x.d<=d&&d<=(x.e||x.d);});
    /* a varied picture of how busy we expect each night to be: weekends and festivals lean busy, but not every one the same */
    if(p[1]==='02'||p[1]==='03')return 'busy'; /* February and March (Gaura Purnima season): every night is in high demand */
    if(fest)return h<.72?'busy':'fill';
    if(w===5||w===6)return h<.44?'busy':h<.74?'fill':'free';
    if(w===0)return h<.16?'busy':h<.48?'fill':'free';
    return h<.1?'busy':h<.38?'fill':'free';} /* overall about 40% of ordinary nights show green */
  function price(d){if(!R)return '';var r=R.rate(type,d);return '₹'+r.toLocaleString('en-IN');}
  function fullBetween(a,b){for(var d=a;d<b;d=addDay(d,1))if(stat(d)==='full')return d;return null;}
  function nice(d){var p=d.split('-'),x=new Date(Date.UTC(+p[0],+p[1]-1,+p[2]));return nkFmt(x,{weekday:'short',day:'numeric',month:'short'})||WD[x.getUTCDay()]+' '+(+p[2])+' '+MN[+p[1]-1].slice(0,3);}
  function month(y,m){
    var first=new Date(Date.UTC(y,m,1)).getUTCDay(),days=new Date(Date.UTC(y,m+1,0)).getUTCDate(),h='<div class="avm"><h4>'+(nkFmt(new Date(Date.UTC(y,m,1)),{month:'long',year:'numeric'})||(MN[m]+' '+y))+'</h4><div class="avm-g">';
    (WDL||WD).forEach(function(w){h+='<span class="wd">'+(WDL?w:w.slice(0,2))+'</span>';});
    for(var i=0;i<first;i++)h+='<span class="avd a-blank"></span>';
    for(var d=1;d<=days;d++){
      var k=ymd(y,m,d),c=['avd'],raw=stat(k),twinFew=raw==='few'&&/Twin/.test(type),st=(raw==='busy'||raw==='fill'||raw==='open'||twinFew)?'free':raw==='fewset'?'few':raw,lbl=price(k),past=k<today; /* the Twin types have only one or two rooms, so 'few left' is their everyday state: they show the price and the usual colours. 'fewset' = the front desk chose Almost full for this date */
      var dm=past?'':raw==='busy'?'busy':raw==='fill'?'fill':raw==='open'?'free':st==='few'?'busy':st==='full'?'':demand(k); /* busy / fill / open: the front desk chose what this date shows */if(dm)c.push('a-dm-'+dm);
      if(past)c.push('a-past');else{if(st&&!(dm&&st==='free'))c.push('a-'+st);if(st==='few')lbl=nkT(/Twin/.test(type)?'Few rooms':'Almost full');if(st==='full')lbl=nkT('Sold out');if(R&&R.period(k).offer)c.push('a-offer');}
      if(k===today)c.push('a-today');
      if(ci&&(k===ci||k===co))c.push('a-sel');else if(ci&&co&&k>ci&&k<co)c.push('a-in');
      h+='<button type="button" class="'+c.join(' ')+'" data-d="'+k+'"'+(past?' disabled':'')+' aria-label="'+nice(k)+(dm?', '+nkT(st==='few'?'only a few rooms left':dm==='busy'?'high demand':dm==='fill'?'popular night':'available'):st?', '+nkT(st==='free'?'available':st==='few'?'only a few rooms left':'sold out'):'')+'"><b>'+d+'</b><small>'+(past?'&nbsp;':lbl)+'</small><i></i></button>';
    }
    return h+'</div></div>';
  }
  function draw(){
    var y=ty,m=tm+off;y+=Math.floor(m/12);m=((m%12)+12)%12;var y2=y,m2=m+1;if(m2>11){m2=0;y2++;}
    $('avcMonths').innerHTML=month(y,m)+month(y2,m2);
    $('avcPrev').disabled=off<=0;$('avcNext').disabled=off>=MAXOFF;
    box.classList.toggle('offline',!AV);
    var sel=$('avcSel');
    if(!ci)sel.textContent=nkT('Pick your check-in date.');
    else if(!co)sel.innerHTML=nkT('Check-in <b>{0}</b>. Now pick your check-out date.').replace('{0}',nice(ci)).replace('.</b>.','.</b>');
    else{var n=0;for(var d=ci;d<co;d=addDay(d,1))n++;var q=R?R.quote(type,ci,co,1,0):null;sel.innerHTML=nkT('<b>{0}</b> to <b>{1}</b>').replace('{0}',nice(ci)).replace('{1}',nice(co))+' · '+nkT(n+' night'+(n>1?'s':''))+(q&&q.total?' · '+nkT('<b>₹'+q.total.toLocaleString('en-IN')+'</b> for one '+type+' room'):'');}
    $('avcBook').hidden=!(ci&&co);$('avcClear').hidden=!ci;
  }
  box.addEventListener('click',function(e){
    var t=e.target.closest('[data-avt]');
    if(t){type=t.getAttribute('data-avt');[].forEach.call(box.querySelectorAll('[data-avt]'),function(b){b.setAttribute('aria-selected',b===t?'true':'false');});
      if(ci&&co&&fullBetween(ci,co)){co=null;}draw();return;}
    var b=e.target.closest('.avd');if(!b||b.disabled)return;
    var d=b.getAttribute('data-d'),st=stat(d);
    if(!ci||co||d<=ci){if(st==='full'){$('avcSel').textContent='That night is sold out for the '+type+'. Try the other room type, or another date.';return;}ci=d;co=null;}
    else{var f=fullBetween(ci,d);if(f){$('avcSel').textContent=nkT('The night of {0} is sold out, so those dates are not free together. Pick an earlier check-out, or another check-in.').replace('{0}',nice(f));return;}co=d;}
    draw();
  });
  $('avcPrev').addEventListener('click',function(){if(off>0){off--;draw();}});
  $('avcNext').addEventListener('click',function(){if(off<MAXOFF){off++;draw();}});
  $('avcClear').addEventListener('click',function(){ci=co=null;draw();});
  /* opened from the booking bar's "Check availability": show this room type, mark the chosen dates, turn to their month and scroll here */
  window.nkAvc={show:function(t,a,b){
    type=t;[].forEach.call(box.querySelectorAll('[data-avt]'),function(x){x.setAttribute('aria-selected',x.getAttribute('data-avt')===t?'true':'false');});
    if(a&&b&&a>=today&&b>a&&!fullBetween(a,b)&&stat(a)!=='full'){ci=a;co=b;off=Math.max(0,Math.min(MAXOFF,(+a.slice(0,4)-ty)*12+(+a.slice(5,7)-1-tm)));}
    draw();if(a&&b&&ci!==a)$('avcSel').textContent=nkT('Some of those nights are sold out for this room. Pick other dates below, or try another room type.');
    box.style.scrollMarginTop='96px';box.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth',block:'start'});}};
  /* "Book these dates": copy them to the booking bar (so the price estimate matches) and send the WhatsApp request */
  $('avcBook').addEventListener('click',function(e){
    e.preventDefault();
    var a=$('ci'),b=$('co'),r=$('rm');if(!a||!b)return;
    a.value=ci;b.value=co;if(r)r.selectedIndex=type==='Large Twin'?2:type==='Deluxe Twin'?1:0;
    [a,b,r].forEach(function(el){if(!el)return;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));});
    if(window.nkBookWA)window.nkBookWA();
  });
  function load(){
    var cached=null;try{cached=JSON.parse(sessionStorage.getItem('nk_av')||'null');}catch(e){}
    if(cached&&Date.now()-cached.at<4*60000&&cached.from===today){AV=cached.map;draw();return;}
    fetch(API,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'deskSiteAvailability',days:180})})
    .then(function(r){return r.json();}).then(function(j){
      if(!j||!j.ok||!j.days)throw 0;
      var map={};j.days.forEach(function(x){map[x.d]=x.t;});AV=map;
      if(R&&R.setDeal){R.setDeal(j.deal||null);if(window.nkTonight)nkTonight();} /* tonight's late price, when the front desk has switched it on */
      try{sessionStorage.setItem('nk_av',JSON.stringify({at:Date.now(),from:today,map:map}));}catch(e){}
      $('avcNote').textContent='Sold-out nights come live from our front desk. The colours show how busy we expect each night to be. Your booking is confirmed once we reply on WhatsApp.';
      draw();
    }).catch(function(){if(!AV){$('avcNote').textContent='Prices shown for each night. Send us your dates and we will confirm free rooms within minutes on WhatsApp.';draw();}});
  }
  if(matchMedia('(hover:hover)').matches){box.addEventListener('pointermove',function(e){var r=box.getBoundingClientRect();box.style.setProperty('--mx',(e.clientX-r.left)+'px');box.style.setProperty('--my',(e.clientY-r.top)+'px');box.classList.add('glow');});box.addEventListener('pointerleave',function(){box.classList.remove('glow');});}
  draw();
  if('IntersectionObserver' in window){var io=new IntersectionObserver(function(es){if(es.some(function(x){return x.isIntersecting;})){io.disconnect();load();setInterval(function(){if(!document.hidden)load();},5*60000);}},{rootMargin:'400px 0px'});io.observe(box);}else load();
  /* after 6 pm in Mayapur ask the front desk straight away, so tonight's late price shows without scrolling to the calendar */
  if(new Date(Date.now()+330*60000).getUTCHours()>=18)load();
})();

}catch(e){console.error("[nikadi part 23]",e);}
/* part 24 */
try{

/* ---- festival calendar: temple festivals (gold), Indian public holidays (saffron), international days (pale green).
   Tap any date for what it is and what to expect in Mayapur. Holiday dates: Government of India 2027 gazetted list
   and West Bengal 2027 list; temple dates: ISKCON Gaurabda calendar. Add next year's dates here. ---- */
(function(){
  var box=document.getElementById('fvCal');if(!box)return;
  var F=window.NK_CAL||[];
  var CAT={f:['fv-f','Mayapur festival'],in:['fv-in','National holiday'],wb:['fv-in','West Bengal holiday'],x:['fv-x','International']};
  var KIND={f:'f',in:'in',wb:'in',x:'x'};
  function T(s){return nkT(s);}
  function esc(t){return String(t).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
  function D(s){var p=s.split('-');return new Date(Date.UTC(+p[0],+p[1]-1,+p[2]));}
  var today=new Date(Date.now()+330*60000).toISOString().slice(0,10);
  function days(a,b){return Math.round((D(b)-D(a))/864e5);}
  var MS=nkNames('m','short',['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']),WS=nkNames('d','short',['Sun','Mon','Tue','Wed','Thu','Fri','Sat']);
  var ML=['January','February','March','April','May','June','July','August','September','October','November','December'];
  function longDate(s){var x=D(s);return nkFmt(x,{weekday:'long',day:'numeric',month:'long',year:'numeric'})||(['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][x.getUTCDay()]+', '+x.getUTCDate()+' '+ML[x.getUTCMonth()]+' '+x.getUTCFullYear());}
  function monthName(s){var x=D(s);return nkFmt(x,{month:'long',year:'numeric'})||(ML[x.getUTCMonth()]+' '+x.getUTCFullYear());}
  var items=F.filter(function(x){return (x.e||x.d)>=today;});
  items.forEach(function(x,i){x.i=i;});
  var filter='all';
  function tags(x){return x.c.map(function(c){return '<span class="fv-t '+CAT[c][0]+'">'+T(CAT[c][1])+'</span>';}).join('')+(x.big?'<span class="fv-t fv-busy">'+T('Busy · book early')+'</span>':'');}
  function card(x){var p=x.d.split('-'),k=KIND[x.c[0]],w=D(x.d).getUTCDay();
    var dt=x.e?(+p[2])+'–'+(+x.e.split('-')[2]):(+p[2]);
    return '<li><button type="button" class="fvc '+CAT[x.c[0]][0]+(x.big?' big':'')+(/Gaura Purnima/.test(x.n)?' gpc':'')+'" data-fv="'+x.i+'"><time datetime="'+x.d+'"><span>'+MS[+p[1]-1]+'</span><b>'+dt+'</b><small>'+(x.e?'':WS[w])+'</small></time><span class="fvc-b"><span class="fvc-n">'+esc(T(x.n))+'</span><span class="fvc-a">'+esc(T(x.a))+'</span><span class="fvc-tags">'+tags(x)+'</span></span><span class="fvc-go" aria-hidden="true">›</span></button></li>';}
  var mi=0,months=[];
  function inMonth(x,m){return x.d.slice(0,7)<=m&&(x.e||x.d).slice(0,7)>=m;}
  function show(){
    var list=items.filter(function(x){return filter==='all'||x.c.some(function(c){return KIND[c]===filter;});});
    var t0=today.slice(0,7),mm={};mm[t0]=1;list.forEach(function(x){var m=x.d.slice(0,7);if(m<t0)m=t0;mm[m]=1;});
    var prev=months[mi];months=Object.keys(mm).sort();
    var j=months.indexOf(prev);mi=j>=0?j:Math.min(mi,months.length-1);if(mi<0)mi=0;
    var m=months[mi],y=+m.slice(0,4),mo=+m.slice(5,7)-1,first=new Date(Date.UTC(y,mo,1)),nd=new Date(Date.UTC(y,mo+1,0)).getUTCDate();
    var ev=list.filter(function(x){return inMonth(x,m);}),yr=m.slice(0,4),years=[];
    months.forEach(function(q){var Y=q.slice(0,4);if(years.indexOf(Y)<0)years.push(Y);});
    var yrs='<div class="fvp-years" role="tablist">'+years.map(function(Y){return '<button type="button" data-fvy="'+Y+'" aria-current="'+(Y===yr)+'">'+Y+'</button>';}).join('')+'</div>';
    var tabs='<div class="fvp-tabs" role="tablist">'+months.map(function(q,i){return q.slice(0,4)!==yr?'':'<button type="button" data-fvm="'+i+'" aria-current="'+(i===mi)+'">'+MS[+q.slice(5,7)-1]+'</button>';}).join('')+'</div>';
    var h='<div class="fvp">'+yrs+tabs+'<div class="fvp-top"><button type="button" class="fvp-ar" data-fvs="-1" aria-label="'+T('Previous month')+'"'+(mi?'':' disabled')+'>‹</button><h3>'+monthName(m+'-01')+'</h3><button type="button" class="fvp-ar" data-fvs="1" aria-label="'+T('Next month')+'"'+(mi<months.length-1?'':' disabled')+'>›</button></div>';
    h+=ev.length?'<ul class="fvm-l">'+ev.map(card).join('')+'</ul>':'<p class="fvp-empty">'+T('Nothing in this list for this month.')+'</p>';
    h+='<p class="fvp-hint">'+T('Swipe or use the arrows to see the next months.')+'</p></div>';
    document.getElementById('fvMonths').innerHTML=h;
    var at=box.querySelector('.fvp-tabs [aria-current=true]');if(at){var tb=at.parentNode;tb.scrollLeft=at.offsetLeft-tb.clientWidth/2+at.clientWidth/2;}
    [].forEach.call(box.querySelectorAll('[data-fvf]'),function(b){b.setAttribute('aria-pressed',b.getAttribute('data-fvf')===filter?'true':'false');});
  }
  function go(n){var k=mi+n;if(k<0||k>=months.length)return;mi=k;show();}
  (function(){var el=document.getElementById('fvMonths'),sx=null,sy=0;
    el.addEventListener('touchstart',function(e){sx=e.touches[0].clientX;sy=e.touches[0].clientY;},{passive:true});
    el.addEventListener('touchend',function(e){if(sx===null)return;var dx=e.changedTouches[0].clientX-sx,dy=e.changedTouches[0].clientY-sy;sx=null;if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy)*1.5)go(dx<0?1:-1);},{passive:true});})();
  /* counts on the filter chips */
  box.addEventListener('click',function(e){var f=e.target.closest('[data-fvf]');if(f){filter=f.getAttribute('data-fvf');show();return;}
    var sv=e.target.closest('[data-fvs]');if(sv){go(+sv.getAttribute('data-fvs'));return;}var tm=e.target.closest('[data-fvm]');if(tm){mi=+tm.getAttribute('data-fvm');show();return;}var ty=e.target.closest('[data-fvy]');if(ty){var Y=ty.getAttribute('data-fvy');for(var q=0;q<months.length;q++)if(months[q].slice(0,4)===Y){mi=q;break;}show();return;}
    var b=e.target.closest('[data-fv]');if(b)open(items[+b.getAttribute('data-fv')],b);});
  /* next temple festival countdown */
  function drawNext(){var nx=items.filter(function(x){return x.c[0]==='f';})[0],el=document.getElementById('fvNext');if(!nx||!el)return;
    var n=days(today,nx.d);
    el.innerHTML='<div class="cd">'+(n<=0?T('Today'):n)+'<small>'+T(n<=0?'Happening now':n===1?'day to go':'days to go')+'</small></div><div><p class="kicker">'+T('Next festival')+' · '+longDate(nx.d)+'</p><h3>'+esc(T(nx.n))+'</h3><p>'+esc(T(nx.a))+'</p></div><button type="button" class="btn btn-gold" data-fv="'+nx.i+'">'+T('Details')+'</button>';
    el.hidden=false;}
  /* details window */
  var dlg=document.getElementById('fvDlg'),last=null;
  function gcal(x){var a=x.d.replace(/-/g,''),b=(x.e?D(x.e):D(x.d));b=new Date(b.getTime()+864e5).toISOString().slice(0,10).replace(/-/g,'');
    return 'https://calendar.google.com/calendar/render?action=TEMPLATE&text='+encodeURIComponent(x.n+' · Mayapur')+'&dates='+a+'/'+b+'&details='+encodeURIComponent(x.a+'\n\nNikadi Guest House, opposite ISKCON Gate No. 4, Mayapur · +91 75011 01137');}
  function open(x,from){if(!dlg||!x)return;last=from||null;
    var n=days(today,x.d),when=n<=0?T('Today'):n===1?T('Tomorrow'):T('in '+n+' days');
    var range=x.e?longDate(x.d)+' – '+longDate(x.e):longDate(x.d);
    var wa='https://wa.me/917501101137?text='+encodeURIComponent('Hare Krishna! I would like to book a room at Nikadi Guest House around '+x.n+' ('+x.d+').');
    dlg.querySelector('.fvd-tags').innerHTML=tags(x);
    dlg.querySelector('#fvdT').textContent=T(x.n);
    dlg.querySelector('.fvd-when').innerHTML='<b>'+range+'</b><span>'+when+'</span>';
    dlg.querySelector('.fvd-a').textContent=T(x.a);
    dlg.querySelector('.fvd-m').textContent=T(x.m);
    dlg.querySelector('.fvd-wa').href=wa;dlg.querySelector('.fvd-cal').href=gcal(x);
    dlg.querySelector('.trd-card').className='trd-card fvd '+CAT[x.c[0]][0];
    dlg.hidden=false;document.documentElement.style.overflow='hidden';dlg.querySelector('.trd-x').focus();}
  function close(){if(!dlg)return;dlg.hidden=true;document.documentElement.style.overflow='';if(last&&last.focus)last.focus();}
  if(dlg){dlg.addEventListener('click',function(e){if(e.target===dlg||e.target.closest('.trd-x'))close();});
    document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!dlg.hidden)close();});}
  document.getElementById('fvNext').addEventListener('click',function(e){var b=e.target.closest('[data-fv]');if(b)open(items[+b.getAttribute('data-fv')],b);});
  show();drawNext();
  document.addEventListener('nk:lang',function(){show();drawNext();});
})();

}catch(e){console.error("[nikadi part 24]",e);}
/* part 25 */
try{

/* ---- v7: festival calendar countdown, staff wall and guest wall (from /data/*.json) ---- */
(function(){
  function $(id){return document.getElementById(id);}
  var MN=nkNames('m','short',['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']),WD=nkNames('d','short',['Sun','Mon','Tue','Wed','Thu','Fri','Sat']);
  var today=new Date(Date.now()+330*60000).toISOString().slice(0,10);
  function dn(a,b){var p=a.split('-'),q=b.split('-');return Math.round((Date.UTC(+q[0],+q[1]-1,+q[2])-Date.UTC(+p[0],+p[1]-1,+p[2]))/864e5);}
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

}catch(e){console.error("[nikadi part 25]",e);}
/* part 26 */
try{

/* ---- page banner: gentle room photo slideshow ---- */
(function(){var s=document.querySelector('.pg-show');if(!s)return;var im=[].slice.call(s.querySelectorAll('img')),i=0;if(im.length<2)return;
if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
setInterval(function(){if(document.hidden)return;im[i].classList.remove('on');i=(i+1)%im.length;im[i].classList.add('on');},4500);})();

}catch(e){console.error("[nikadi part 26]",e);}
/* part 27 */
try{

/* ---- language switch: English, বাংলা, हिन्दी, Русский, 中文, Español ----
   Same rules as tools/i18n-extract.py: a block of text (with its bold words and links) is one key. */
(function(){
  var L=[['en','English','EN'],['bn','বাংলা','Bengali'],['hi','हिन्दी','Hindi'],['ru','Русский','Russian'],['zh','中文','Chinese'],['es','Español','Spanish']];
  var cur=document.documentElement.getAttribute('data-lang')||'en';
  var INLINE={A:1,B:1,STRONG:1,EM:1,I:1,SMALL:1,S:1,SPAN:1,BR:1,SUP:1,U:1,TIME:1,MARK:1,ABBR:1},SKIP={SCRIPT:1,STYLE:1,SVG:1,NOSCRIPT:1,TEXTAREA:1,TEMPLATE:1,IFRAME:1,BLOCKQUOTE:1,INPUT:1};
  var ATTRS=['alt','aria-label','placeholder','title'];
  function ws(t){return t.replace(/\s+/g,' ');}
  function canon(el){var o='';for(var c=el.firstChild;c;c=c.nextSibling){if(c.nodeType===3)o+=ws(c.nodeValue);else if(c.nodeType===1){var n=c.tagName.toLowerCase();if(n==='br')o+='<br>';else o+='<'+n+'>'+canon(c)+'</'+n+'>';}}return o;}
  function hasText(el){for(var c=el.firstChild;c;c=c.nextSibling)if(c.nodeType===3&&/[A-Za-z]/.test(c.nodeValue))return true;return false;}
  function isUnit(el){if(!hasText(el))return false;var all=el.getElementsByTagName('*');for(var i=0;i<all.length;i++){var d=all[i];if(!INLINE[d.tagName]||d.id||d.tagName==='BUTTON')return false;}return true;}
  function fill(el,tr){
    var orig={};[].forEach.call(el.getElementsByTagName('*'),function(x){(orig[x.tagName]=orig[x.tagName]||[]).push(x);});
    var t=document.createElement('template');t.innerHTML=tr;var used={};
    [].forEach.call(t.content.querySelectorAll('*'),function(x){var a=orig[x.tagName],k=used[x.tagName]||0;used[x.tagName]=k+1;var o=a&&a[k];if(o)for(var j=0;j<o.attributes.length;j++)x.setAttribute(o.attributes[j].name,o.attributes[j].value);});
    el.textContent='';el.appendChild(t.content);
  }
  function apply(D){
    var U=D.units||{},A=D.attrs||{};
    /* tr(): exact match, then a number template ("In {0} h {1} min"), then each " · " part on its own */
    var NUM=/\d+(?:[.,:]\d+)*/g,DUR=/\b(\d+) h(?: (\d+) min)?\b|\b(\d+) min\b/g;
    function sub(t,n){return t.replace(/\{(\d+)\}/g,function(_,i){return n[+i]!=null?n[+i]:'';});}
    function dur(x){var m=/(\d+) h(?: (\d+) min)?|(\d+) min/.exec(x),k=m[1]?(m[2]?'{0} h {1} min':'{0} h'):'{0} min',v=m[1]?(m[2]?[m[1],m[2]]:[m[1]]):[m[3]];return U[k]?sub(U[k],v):x;}
    function tr1(k){if(U[k])return U[k];if(A[k])return A[k];var D=[],t0=k.replace(DUR,function(x){D.push(x);return '\u0001';}),n=[],t=t0.replace(NUM,function(x){n.push(x);return '{'+(n.length-1)+'}';});
      var key=t.replace(/\u0001/g,'{D}');if((n.length||D.length)&&U[key]){var di=0;return sub(U[key],n).replace(/\{D\}/g,function(){return dur(D[di++]);});}return null;}
    function tr(k){k=ws(k).trim();if(!k||!/[A-Za-z]/.test(k))return null;var r=tr1(k);if(r!=null)return r;
      var ci=k.indexOf(': ');if(ci>0){var rt=k.slice(ci+2),a1=tr1(k.slice(0,ci)),b1=tr1(rt);if(b1==null&&(!/[a-z]{2}/.test(rt.replace(/\b[A-Z@][\w.'@-]*/g,''))))b1=rt;if(a1!=null&&b1!=null)return a1+': '+b1;}
      var parts=k.split(/( · | → | ⇄ )/);if(parts.length<2)return null;var ok=0,out=parts.map(function(x,i){if(i%2||!/[A-Za-z]/.test(x))return x;var y=tr(x);if(y!=null){ok++;return y;}return x;});return ok?out.join(''):null;}
    window.nkT=function(s){return tr(s)||s;};
    function txt(c){var v=c.nodeValue,t=tr(v);if(t!=null&&t!==ws(v).trim()){c.nodeValue=v.match(/^\s*/)[0]+t+v.match(/\s*$/)[0];}}
    function attrs(el){ATTRS.forEach(function(a){var v=el.getAttribute(a);if(v){var t=tr(v);if(t)el.setAttribute(a,t);}});}
    function walk(el){
      for(var c=el.firstChild;c;c=c.nextSibling){
        if(c.nodeType===3){txt(c);continue;}
        if(c.nodeType!==1||c.hasAttribute('data-noi18n'))continue;
        if(c.tagName==='INPUT'||c.tagName==='TEXTAREA'){attrs(c);continue;}
        if(SKIP[c.tagName])continue;
        attrs(c);
        if(c.tagName==='SELECT'){[].forEach.call(c.options,function(o){var k=ws(o.textContent).trim();if(U[k])o.textContent=U[k];});continue;}
        if(isUnit(c)){var k2=canon(c).trim(),u2=tr1(k2);if(u2!=null){fill(c,u2);continue;}}
        walk(c);
      }
    }
    walk(document.body);
    /* text the page scripts write later (live temple status, prices, calendar, weather) */
    function ok(n){for(var e=n.nodeType===1?n:n.parentNode;e&&e!==document.body;e=e.parentNode){if(e.nodeType===1&&(SKIP[e.tagName]||e.hasAttribute('data-noi18n')))return false;}return true;}
    var busy=false,mo=new MutationObserver(function(ms){if(busy)return;busy=true;try{ms.forEach(function(m){
      if(m.type==='characterData'){if(ok(m.target))txt(m.target);return;}
      var t=m.target;if(t.nodeType!==1||!ok(t))return;
      if(m.type==='attributes'){var v=t.getAttribute(m.attributeName),r=v&&tr(v);if(r)t.setAttribute(m.attributeName,r);return;}
      if(isUnit(t)){var k=canon(t).trim(),r2=tr1(k);if(r2!=null){fill(t,r2);return;}}
      m.addedNodes.forEach(function(n){if(n.nodeType===3)txt(n);else if(n.nodeType===1&&!SKIP[n.tagName]&&!n.hasAttribute('data-noi18n')){attrs(n);if(isUnit(n)){var k3=canon(n).trim(),u3=tr1(k3);if(u3!=null){fill(n,u3);return;}}walk(n);}});
    });}catch(e){console.error(e);}mo.takeRecords();busy=false;});
    mo.observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:ATTRS});
    var tk=ws(document.title).trim();if(U[tk])document.title=U[tk];
    var md=document.querySelector('meta[name=description]');if(md&&U[md.content])md.content=U[md.content];
  }
  function pick(code){try{localStorage.setItem('nk_lang',code);}catch(e){}
    var u=new URL(location.href);u.searchParams.delete('lang');if(code!=='en')u.searchParams.set('lang',code);location.href=u.toString();}
  var btn=document.getElementById('langBtn'),list=document.getElementById('langList'),ml=document.getElementById('menuLangs');
  var me=L.filter(function(x){return x[0]===cur;})[0]||L[0];
  if(btn){document.getElementById('langCode').textContent=me[0]==='en'?'EN':me[1];
    list.innerHTML=L.map(function(x){return '<button type="button" data-lang-pick="'+x[0]+'"'+(x[0]===cur?' aria-current="true"':'')+'><span>'+x[1]+'</span><small>'+(x[0]==='en'?'':x[2])+'</small></button>';}).join('');
    btn.addEventListener('click',function(e){e.stopPropagation();var o=list.hidden;list.hidden=!o;btn.setAttribute('aria-expanded',o?'true':'false');});
    document.addEventListener('click',function(e){if(!list.hidden&&!e.target.closest('.lang')){list.hidden=true;btn.setAttribute('aria-expanded','false');}});
    document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!list.hidden){list.hidden=true;btn.setAttribute('aria-expanded','false');btn.focus();}});}
  if(ml)ml.innerHTML=L.map(function(x){return '<button type="button" data-lang-pick="'+x[0]+'"'+(x[0]===cur?' aria-current="true"':'')+'>'+x[1]+'</button>';}).join('');
  document.addEventListener('click',function(e){var b=e.target.closest('[data-lang-pick]');if(b){var c=b.getAttribute('data-lang-pick');if(c!==cur)pick(c);}});
  if(cur!=='en')document.addEventListener('click',function(e){var a=e.target.closest('a[href]');if(!a)return;var h=a.getAttribute('href');if(/^\/(?:[\w-]+\.html)?(?:#.*)?$/.test(h)){var u=new URL(h,location.href);u.searchParams.set('lang',cur);a.href=u.pathname+u.search+u.hash;}},true);
  if(cur==='en')return;
  var done=function(){document.documentElement.classList.remove('i18n-wait');};
  fetch('/data/i18n/'+cur+'.json?v=3').then(function(r){if(!r.ok)throw 0;return r.json();}).then(function(D){try{apply(D);}catch(e){console.error(e);}done();try{document.dispatchEvent(new Event('nk:lang'));}catch(e){}}).catch(done);
})();

}catch(e){console.error("[nikadi part 27]",e);}
/* part 28 */
try{

/* ---- Snow preview (?wx=snow). Mayapur does not get snow, so this never comes from the live weather; it is a look that can be switched on. ---- */
(function(){if(!/[?&]wx=snow\b/.test(location.search))return;var H=document.documentElement;H.classList.add('snowy');
  /* snow lying on top of buttons and boxes */
  function caps(){var list=document.querySelectorAll('.btn,.offer-card,form.book,.hero-media,.rd-book,.wx-mute,.qrail a,.qrail button,.gad>*,.ex>*,.sites>*,.mem-card,.review,.card,.top');
    for(var i=0;i<list.length&&i<260;i++){var e=list[i];if(e.querySelector(':scope>.snowcap')||!e.offsetParent&&getComputedStyle(e).position!=='fixed')continue;var cs=getComputedStyle(e),w=e.offsetWidth;if(w<70)continue;
      if(cs.position==='static')e.style.position='relative';var c=document.createElement('span');c.className='snowcap'+(cs.overflow!=='visible'||e.classList.contains('top')?' in':'')+(w>420?' big':'');c.setAttribute('aria-hidden','true');
      if(e.classList.contains('top')){c.style.top='auto';c.style.bottom='-9px';}
      c.style.backgroundPositionX=(-Math.random()*96|0)+'px';e.appendChild(c);}}
  function start(){caps();setTimeout(caps,1800);setTimeout(caps,5000);
    if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    var cv=document.createElement('canvas');cv.id='snowfall';cv.setAttribute('aria-hidden','true');document.body.appendChild(cv);var x=cv.getContext('2d'),F=[],W=0,Ht=0,last=0,wind=0,wt=0;
    function size(){W=cv.width=innerWidth;Ht=cv.height=innerHeight;var N=Math.round(Math.min(260,W*Ht/7000));while(F.length<N)F.push(mk(true));F.length=N;}
    function mk(any){var d=Math.random();return {x:Math.random()*(W+200)-100,y:any?Math.random()*Ht:-10,r:.8+d*d*3.4,v:.35+d*1.5+Math.random()*.4,p:Math.random()*6.28,s:.6+Math.random()*1.2,a:.45+Math.random()*.5};}
    size();addEventListener('resize',size);
    (function loop(t){requestAnimationFrame(loop);if(document.hidden)return;var dt=Math.min(50,t-last||16)/16;last=t;if(t>wt){wt=t+4000+Math.random()*5000;wind=(Math.random()-.4)*.9;}
      x.clearRect(0,0,W,Ht);x.fillStyle='#fff';for(var i=0;i<F.length;i++){var f=F[i];f.p+=.012*f.s*dt;f.y+=f.v*dt;f.x+=(Math.sin(f.p)*.45+wind*(.4+f.r*.2))*dt;
        if(f.y>Ht+8||f.x<-120||f.x>W+120){F[i]=f=mk(false);if(Math.abs(wind)>.3&&Math.random()<.3){f.x=wind>0?-20:W+20;f.y=Math.random()*Ht*.7;}}
        x.globalAlpha=f.a;x.beginPath();x.arc(f.x,f.y,f.r,0,6.283);x.fill();if(f.r>3){x.globalAlpha=f.a*.25;x.beginPath();x.arc(f.x,f.y,f.r*1.9,0,6.283);x.fill();}}
      x.globalAlpha=1;})(0);}
  if(document.readyState==='complete')start();else addEventListener('load',start);
})();

}catch(e){console.error("[nikadi part 28]",e);}
/* part 29 */
try{

/* ---- Visit counter for the owner's admin page. Nothing personal: a random number for this browser, the pages opened and the time spent.
        No name, no phone, no cookies. Devices signed in to the staff app are not counted. ---- */
(function(){try{
  var API="https://ebwdrqdsexjterbxyeoa.supabase.co/functions/v1/api",LS=localStorage,SS=sessionStorage,UA=navigator.userAgent||'';
  if(!/(^|\.)nikadiguesthouse\.com$/.test(location.hostname)||navigator.webdriver||/bot|crawl|spider|headless|lighthouse|preview|monitor/i.test(UA))return;
  if(/[?&](guest|sky|wx|fx|dark)=/.test(location.search)||LS.getItem('nk_notrack')||LS.getItem('nk-staff-token'))return;
  function rid(){var a='abcdefghijklmnopqrstuvwxyz0123456789',o='';for(var i=0;i<16;i++)o+=a.charAt(Math.random()*36|0);return o;}
  var first=false,vid=LS.getItem('nk_vid');if(!/^[a-z0-9]{16}$/.test(vid||'')){vid=rid();first=true;LS.setItem('nk_vid',vid);}
  var now=Date.now(),sid=SS.getItem('nk_sid'),fresh=!sid||now-Number(SS.getItem('nk_sat')||0)>18e5;if(fresh){sid=rid();SS.setItem('nk_sid',sid);SS.setItem('nk_ss','0');}
  var secs=Number(SS.getItem('nk_ss'))||0,sent=-1,W=Math.min(screen.width||9999,innerWidth||9999);
  function send(x){var b={action:'deskSiteHit',sid:sid,vid:vid,path:location.pathname,secs:Math.round(secs)};for(var k in x)b[k]=x[k];sent=secs;SS.setItem('nk_sat',String(Date.now()));
    var j=JSON.stringify(b);try{if(navigator.sendBeacon&&navigator.sendBeacon(API,j))return;}catch(e){}try{fetch(API,{method:'POST',body:j,keepalive:true}).catch(function(){});}catch(e){}}
  var ref='';try{if(document.referrer)ref=new URL(document.referrer).hostname;}catch(e){}
  if(fresh)send({first:first,ref:ref,dev:/iPad|Tablet/i.test(UA)||(W>=700&&W<1100&&'ontouchstart' in window)?'tablet':/Mobi|Android|iPhone/i.test(UA)||W<700?'mobile':'desktop',
    tz:(function(){try{return Intl.DateTimeFormat().resolvedOptions().timeZone||'';}catch(e){return '';}})(),lang:navigator.language||'',member:!!LS.getItem('nk_token')});
  else send({page:true,member:!!LS.getItem('nk_token')});
  /* time is counted only while the page is in front; a short note goes out now and then so "on the site now" is right */
  setInterval(function(){if(document.hidden||secs>7200)return;secs+=5;SS.setItem('nk_ss',String(secs));if(secs===15||secs===45||(secs>45&&(secs-45)%60===0))send({});},5000);
  function bye(){if(secs!==sent)send({});}
  document.addEventListener('visibilitychange',function(){if(document.hidden)bye();});addEventListener('pagehide',bye);
  window.nkTrack=function(ev){send({ev:ev});};
  document.addEventListener('click',function(e){var a=e.target&&e.target.closest?e.target.closest('a[href]'):null;if(!a)return;var h=a.getAttribute('href')||'';
    if(/wa\.me|whatsapp\.com/.test(h))send({ev:'wa'});else if(/^tel:/.test(h))send({ev:'call'});else if(/\/app\/|membership/.test(h))send({ev:'join'});},true);
}catch(e){}})();

}catch(e){console.error("[nikadi part 29]",e);}