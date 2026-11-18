/* ---- walk on the moon (desktop only): tap the moon in the night sky. Three.js loads only when you open it.
   Walk, run, jump and fly with the jetpack; get into the spaceship (E) and fly to the planets; fly into the Earth to land in Mayapur. ---- */
(function(){
  var hit=document.getElementById('moonHit'),box=document.getElementById('moonX');if(!hit||!box)return;
  var THREE_URL='https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
  var G=null,open=false,raf=0;
  function loadThree(cb){if(window.THREE)return cb();var s=document.createElement('script');s.src=THREE_URL;s.onload=cb;s.onerror=function(){document.querySelector('#mwLoad p').textContent='The moon could not load. Please check your connection and try again.';};document.head.appendChild(s);}

  function build(){
    var T=window.THREE,W=innerWidth,H=innerHeight;
    var R=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance',logarithmicDepthBuffer:true});R.setPixelRatio(Math.min(1.5,devicePixelRatio||1));R.setSize(W,H);
    R.shadowMap.enabled=true;R.shadowMap.type=T.PCFSoftShadowMap;R.outputEncoding=T.sRGBEncoding;R.toneMapping=T.ACESFilmicToneMapping;R.toneMappingExposure=.82;
    box.insertBefore(R.domElement,box.firstChild);
    var S=new T.Scene();S.background=new T.Color(0x000000);
    var cam=new T.PerspectiveCamera(55,W/H,.1,200000);

    /* ---- noise ---- */
    function hs(x,y){var n=(x*374761393+y*668265263)|0;n=(n^(n>>13))*1274126177|0;return ((n^(n>>16))&0xffff)/0xffff;}
    function vn(x,y){var xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi,u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf),a=hs(xi,yi),b=hs(xi+1,yi),c=hs(xi,yi+1),d=hs(xi+1,yi+1);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;}
    function fbm(x,y,o){var t=0,am=1,f=1,s=0;for(var k=0;k<o;k++){t+=am*vn(x*f,y*f);s+=am;f*=2.03;am*=.5;}return t/s;}
    var SIZE=900,HALF=SIZE/2,CR=[],i,HA=14,HO=0,HS=.012,FEAT=[],HEART=0;
    function craters(n,big){CR=[];for(var k=0;k<n*2.5;k++){var r=Math.random()<.12?14+Math.random()*16:2+Math.pow(Math.random(),2)*9;var cx0=Math.random()*SIZE-HALF,cz0=Math.random()*SIZE-HALF;if(Math.hypot(cx0-7,cz0-15)<r*1.8+26)continue;CR.push([cx0,cz0,r,r*(.18+Math.random()*.1)*(big||1)]);}if(n)CR.push([0,-40,22,4.5*(big||1)]);}
    craters(70);
    /* heightA is the exact formula; height() reads the same grid the ground mesh is drawn from, so feet always touch the ground */
    var N=360,HG=new Float32Array((N+1)*(N+1));
    function height(x,z){var c=SIZE/N,fx=(x+HALF)/c,fz=(z+HALF)/c;if(fx<0||fz<0||fx>=N||fz>=N)return heightA(x,z);var ix=fx|0,iz=fz|0,u=fx-ix,v=fz-iz,k=iz*(N+1)+ix,ha=HG[k],hd=HG[k+1],hb=HG[k+N+1],hc=HG[k+N+2];
      return u+v<=1?ha+(hd-ha)*u+(hb-ha)*v:hc+(hb-hc)*(1-u)+(hd-hc)*(1-v);}
    function heightA(x,z){var h=(fbm(x*HS+HO,z*HS+HO,5)-.5)*HA+(fbm(x*.09+HO,z*.09,3)-.5)*1.3;
      for(var k=0;k<CR.length;k++){var c=CR[k],dx=x-c[0],dz=z-c[1],d2=dx*dx+dz*dz,rr=c[2]*1.8;if(d2>rr*rr)continue;var d=Math.sqrt(d2)/c[2];
        if(d<1)h+=c[3]*(d*d-1);h+=c[3]*.38*Math.exp(-Math.pow((d-1)/.28,2));}
      for(var f=0;f<FEAT.length;f++){var F=FEAT[f],fd=Math.hypot(x-F.x,z-F.z);if(fd<F.r){var fu=1-fd/F.r;h+=F.h*fu*fu*(3-2*fu);if(fd<F.r*.14)h-=F.h*.18*(1-fd/(F.r*.14));}}
      var e=Math.max(Math.abs(x),Math.abs(z))-HALF*.82;if(e>0)h+=e*e*.02;return h;}
    /* fine regolith grain */
    var gc=document.createElement('canvas');gc.width=gc.height=256;var gx=gc.getContext('2d'),gi=gx.createImageData(256,256);for(i=0;i<256*256;i++){var q=200+Math.random()*55;gi.data[i*4]=gi.data[i*4+1]=gi.data[i*4+2]=q;gi.data[i*4+3]=255;}gx.putImageData(gi,0,0);
    var gt=new T.CanvasTexture(gc);gt.wrapS=gt.wrapT=T.RepeatWrapping;gt.repeat.set(300,300);
    /* ---- ground ---- */
    var geo=new T.PlaneGeometry(SIZE,SIZE,N,N);geo.rotateX(-Math.PI/2);var pa=geo.attributes.position,col=new Float32Array(pa.count*3);
    for(i=0;i<pa.count;i++){var x=pa.getX(i),z=pa.getZ(i),y=heightA(x,z);HG[i]=y;pa.setY(i,y);var g=.3+(fbm(x*.05+9,z*.05+3,3)-.5)*.2+(fbm(x*.4,z*.4,2)-.5)*.08,m=fbm(x*.006+40,z*.006,3)<.42?.72:1;col[i*3]=g*m;col[i*3+1]=g*m*.985;col[i*3+2]=g*m*.96;}
    geo.setAttribute('color',new T.BufferAttribute(col,3));geo.computeVertexNormals();
    var ground=new T.Mesh(geo,new T.MeshStandardMaterial({vertexColors:true,map:gt,bumpMap:gt,bumpScale:.06,roughness:1,metalness:0}));ground.receiveShadow=true;S.add(ground);
    /* the rest of the moon, so it is a real ball when you fly away */
    var MR=1800,mt=document.createElement('canvas');mt.width=1024;mt.height=512;var mx=mt.getContext('2d'),mi=mx.createImageData(1024,512);
    for(i=0;i<1024*512;i++){var u=i%1024,v=(i/1024)|0,n=fbm(u*.012,v*.024,5),mar=fbm(u*.004+5,v*.008+9,4)<.42?.62:1,c=(.36+(n-.5)*.3)*mar*255;mi.data[i*4]=c;mi.data[i*4+1]=c*.985;mi.data[i*4+2]=c*.96;mi.data[i*4+3]=255;}mx.putImageData(mi,0,0);
    var ctex=new T.CanvasTexture(mt);var moonBall=new T.Mesh(new T.SphereGeometry(MR,96,64),new T.MeshStandardMaterial({map:ctex,roughness:1}));moonBall.position.set(0,-MR-16,0);moonBall.receiveShadow=true;S.add(moonBall);
    var MOONC=moonBall.position.clone();
    /* ---- rocks: on the ground, and floating ---- */
    function rockGeo(seed){var g=new T.IcosahedronGeometry(1,2),p=g.attributes.position;for(var k=0;k<p.count;k++){var v=new T.Vector3(p.getX(k),p.getY(k),p.getZ(k)),n=.75+.5*vn(v.x*2+seed,v.y*2+v.z*2+seed*3);v.multiplyScalar(n);v.y*=.7;p.setXYZ(k,v.x,v.y,v.z);}g.computeVertexNormals();return g;}
    var rm=new T.MeshStandardMaterial({color:0x8a8783,roughness:.95,bumpMap:gt,bumpScale:.05}),dummy=new T.Object3D();
    var PAD={x:14,z:22};
    var ROCKS=[];function placeRocks(){ROCKS.forEach(function(im){for(var i=0;i<im.count;i++){var rx,rz;do{rx=Math.random()*SIZE*.8-SIZE*.4;rz=Math.random()*SIZE*.8-SIZE*.4;}while(Math.hypot(rx-PAD.x,rz-PAD.z)<12||Math.hypot(rx,rz-8)<6);var s=Math.random()<.08?1.5+Math.random()*2.5:.15+Math.pow(Math.random(),2)*.9;
        dummy.position.set(rx,height(rx,rz)+s*.25,rz);dummy.rotation.set(Math.random()*3,Math.random()*6,Math.random()*3);dummy.scale.set(s,s*(.6+Math.random()*.6),s);dummy.updateMatrix();im.setMatrixAt(i,dummy.matrix);}im.instanceMatrix.needsUpdate=true;});}
    for(var vv=0;vv<3;vv++){var im=new T.InstancedMesh(rockGeo(vv*7.3),rm,420);im.castShadow=im.receiveShadow=true;ROCKS.push(im);S.add(im);}placeRocks();
    var floaters=[],fg=rockGeo(11);
    for(i=0;i<70;i++){var fm=new T.Mesh(fg,rm);var fs=.2+Math.pow(Math.random(),2)*1.6;fm.scale.setScalar(fs);var fx=Math.random()*240-120,fz=Math.random()*240-120;
      fm.position.set(fx,height(fx,fz)+3+Math.random()*28,fz);fm.castShadow=true;fm.userData={b:fm.position.y,ph:Math.random()*6,rs:new T.Vector3(Math.random()-.5,Math.random()-.5,Math.random()-.5).multiplyScalar(.4),sp:.2+Math.random()*.5};S.add(fm);floaters.push(fm);}
    var dN=1600,dp=new Float32Array(dN*3);for(i=0;i<dN;i++){dp[i*3]=Math.random()*200-100;dp[i*3+1]=Math.random()*30;dp[i*3+2]=Math.random()*200-100;}
    var dg=new T.BufferGeometry();dg.setAttribute('position',new T.BufferAttribute(dp,3));var dust=new T.Points(dg,new T.PointsMaterial({color:0xd8d4cc,size:.08,transparent:true,opacity:.55,depthWrite:false}));S.add(dust);
    /* ---- sky: stars and the Milky Way, always around the camera ---- */
    var sky=new T.Group();S.add(sky);
    var sN=7000,sp=new Float32Array(sN*3);for(i=0;i<sN;i++){var th=Math.random()*Math.PI*2,ph=Math.acos(Math.random()*2-1),rr2=150000;sp[i*3]=rr2*Math.sin(ph)*Math.cos(th);sp[i*3+1]=rr2*Math.cos(ph);sp[i*3+2]=rr2*Math.sin(ph)*Math.sin(th);}
    var sg=new T.BufferGeometry();sg.setAttribute('position',new T.BufferAttribute(sp,3));sky.add(new T.Points(sg,new T.PointsMaterial({color:0xffffff,size:1.6,sizeAttenuation:false,depthWrite:false})));
    var gN=16000,gp=new Float32Array(gN*3),gcol=new Float32Array(gN*3);for(i=0;i<gN;i++){var a=Math.random()*Math.PI*2,sprd=(Math.random()+Math.random()+Math.random()-1.5)*.16,b=sprd;
      var px=Math.cos(a)*Math.cos(b),py=Math.sin(b),pz=Math.sin(a)*Math.cos(b),rr3=140000;var ca=Math.cos(.9),sa=Math.sin(.9);gp[i*3]=px*rr3;gp[i*3+1]=(py*ca-pz*sa)*rr3;gp[i*3+2]=(py*sa+pz*ca)*rr3;
      var w=Math.random();gcol[i*3]=.75+w*.25;gcol[i*3+1]=.7+w*.2;gcol[i*3+2]=.85+(1-w)*.15;}
    var gg=new T.BufferGeometry();gg.setAttribute('position',new T.BufferAttribute(gp,3));gg.setAttribute('color',new T.BufferAttribute(gcol,3));
    sky.add(new T.Points(gg,new T.PointsMaterial({size:1.1,sizeAttenuation:false,vertexColors:true,transparent:true,opacity:.55,depthWrite:false})));
    /* ---- the Sun and the nine planets ---- */
    function label(txt,big){var c=document.createElement('canvas');c.width=512;c.height=128;var x=c.getContext('2d');x.font='600 '+(big?64:54)+'px Georgia,serif';x.textAlign='center';x.textBaseline='middle';
      x.shadowColor='rgba(0,0,0,.8)';x.shadowBlur=12;x.fillStyle='#f4e7c4';x.fillText(txt,256,64);var sp2=new T.Sprite(new T.SpriteMaterial({map:new T.CanvasTexture(c),depthTest:false,transparent:true,sizeAttenuation:false}));sp2.scale.set(.16,.04,1);sp2.renderOrder=9;return sp2;}
    function band(cols,noise,spot){var c=document.createElement('canvas');c.width=1024;c.height=512;var x=c.getContext('2d'),d=x.createImageData(1024,512),P=cols.map(function(h){return [parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];}),n=P.length;
      for(var j=0;j<512;j++)for(var i2=0;i2<1024;i2++){var tb=noise?0:(fbm(i2*.012,j*.05,4)-.5)*.16+(fbm(i2*.05+9,j*.12,3)-.5)*.05,v=Math.max(0,Math.min(.9999,j/512+tb))*n,a=Math.floor(v),f=v-a,A1=P[a],B1=P[Math.min(n-1,a+1)];f=f*f*(3-2*f);
        var g=noise?.7+fbm(i2*.03,j*.03,5)*.6:.92+fbm(i2*.08,j*.2,3)*.16,k=(j*1024+i2)*4;d.data[k]=(A1[0]+(B1[0]-A1[0])*f)*g;d.data[k+1]=(A1[1]+(B1[1]-A1[1])*f)*g;d.data[k+2]=(A1[2]+(B1[2]-A1[2])*f)*g;d.data[k+3]=255;}
      x.putImageData(d,0,0);
      if(noise)for(var q=0;q<140;q++){var cx=Math.random()*1024,cy=Math.random()*512,cr=2+Math.random()*Math.random()*16;x.fillStyle='rgba(0,0,0,.18)';x.beginPath();x.arc(cx,cy,cr,0,7);x.fill();x.strokeStyle='rgba(255,255,255,.14)';x.lineWidth=1.5;x.beginPath();x.arc(cx,cy,cr,3.6,6);x.stroke();}
      if(spot){var sgd=x.createRadialGradient(660,330,4,660,330,60);sgd.addColorStop(0,'rgba(190,70,40,.95)');sgd.addColorStop(.6,'rgba(200,100,60,.7)');sgd.addColorStop(1,'rgba(200,120,80,0)');x.save();x.translate(660,330);x.scale(1.7,1);x.translate(-660,-330);x.fillStyle=sgd;x.beginPath();x.arc(660,330,60,0,7);x.fill();x.restore();}
      var tx=new T.CanvasTexture(c);tx.encoding=T.sRGBEncoding;tx.anisotropy=8;return tx;}
    function earthTex(){var ec=document.createElement('canvas');ec.width=1024;ec.height=512;var ex=ec.getContext('2d'),ed=ex.createImageData(1024,512);
      for(var j=0;j<1024*512;j++){var u=j%1024,v=(j/1024)|0,land=fbm(u*.006,v*.012,5),cl=fbm(u*.012+30,v*.03,4),pole=Math.abs(v/256-1)>.86,c;
        if(pole)c=[235,240,245];else if(land>.55)c=[60+land*60,95+land*50,55];else c=[18,58,140];if(cl>.6&&!pole){var k2=Math.min(1,(cl-.6)*5);c=[c[0]+(250-c[0])*k2,c[1]+(250-c[1])*k2,c[2]+(250-c[2])*k2];}
        ed.data[j*4]=c[0];ed.data[j*4+1]=c[1];ed.data[j*4+2]=c[2];ed.data[j*4+3]=255;}ex.putImageData(ed,0,0);return new T.CanvasTexture(ec);}
    var bodies=[];
    function planet(name,r,pos,mat,opts){opts=opts||{};var m=new T.Mesh(new T.SphereGeometry(r,64,48),mat);m.position.copy(pos);S.add(m);var lb=label(name,opts.big);lb.position.copy(pos).add(new T.Vector3(0,r*1.35,0));S.add(lb);
      if(opts.ring){var rg=new T.RingGeometry(r*1.3,r*2.3,96),rc=document.createElement('canvas');rc.width=256;rc.height=4;var rx2=rc.getContext('2d');for(var k=0;k<256;k++){rx2.fillStyle='rgba(220,200,160,'+(.25+.6*fbm(k*.08,3,3)).toFixed(2)+')';rx2.fillRect(k,0,1,4);}
        var rt=new T.CanvasTexture(rc),uv=rg.attributes.uv,pp=rg.attributes.position;for(var q2=0;q2<pp.count;q2++){var d=Math.hypot(pp.getX(q2),pp.getY(q2));uv.setXY(q2,(d-r*1.3)/(r*1.0),.5);}
        var ring=new T.Mesh(rg,new T.MeshBasicMaterial({map:rt,side:T.DoubleSide,transparent:true,depthWrite:false}));ring.rotation.x=Math.PI/2.3;m.add(ring);}
      if(opts.atm){var at=new T.Mesh(new T.SphereGeometry(r*1.05,48,32),new T.MeshBasicMaterial({color:opts.atm,transparent:true,opacity:.2,side:T.BackSide}));m.add(at);}
      var b={name:name,m:m,lb:lb,r:r,exit:!!opts.exit,spin:opts.spin||.01};bodies.push(b);return b;}
    function std(o){return new T.MeshStandardMaterial(Object.assign({roughness:.9,metalness:0},o));}
    var SUNP=new T.Vector3(44000,22000,22000);
    var sunMesh=planet('Sun',2600,SUNP,new T.MeshBasicMaterial({color:0xfff3d6}),{big:1});
    var sglow=document.createElement('canvas');sglow.width=sglow.height=256;var sgx=sglow.getContext('2d'),sgg=sgx.createRadialGradient(128,128,0,128,128,128);sgg.addColorStop(0,'rgba(255,240,200,1)');sgg.addColorStop(.25,'rgba(255,200,120,.45)');sgg.addColorStop(1,'rgba(255,170,90,0)');sgx.fillStyle=sgg;sgx.fillRect(0,0,256,256);
    var halo=new T.Sprite(new T.SpriteMaterial({map:new T.CanvasTexture(sglow),transparent:true,depthWrite:false,blending:T.AdditiveBlending}));halo.scale.set(16000,16000,1);halo.position.copy(SUNP);S.add(halo);
    var EARTHP=new T.Vector3(-2400,900,-5200);
    var earth=planet('Earth',260,EARTHP,std({map:earthTex(),roughness:.7,emissive:0x0a1a3a}),{atm:0x6fa8ff,exit:1,spin:.02});
    planet('Mercury',90,new T.Vector3(34000,15000,20000),std({map:band(['#8d8580','#a49c94','#7d756f'],1)}));
    planet('Venus',230,new T.Vector3(24000,9000,5000),std({map:band(['#e8cf9a','#d9b877','#efdcae','#cfae70'])}),{atm:0xffe0a0});
    planet('Mars',150,new T.Vector3(-9000,2500,6000),std({map:band(['#a5502f','#c06a3e','#8e4026','#b55f36'],1)}),{atm:0xff9a70});
    planet('Jupiter',1300,new T.Vector3(-26000,7000,-20000),std({map:band(['#d8c3a5','#b08b67','#e8d9c0','#9c7350','#d1b48f','#c59c74','#efe3cf','#a57e5a'],0,1)}),{spin:.03});
    planet('Saturn',1100,new T.Vector3(12000,6000,-32000),std({map:band(['#e3d2a6','#cdb57f','#efe2bd','#c4a872','#dcc797'])}),{ring:1,spin:.025});
    planet('Uranus',600,new T.Vector3(-36000,10000,14000),std({map:band(['#a9dde3','#9bd1d8','#b7e6ea'])}),{atm:0xbff2f6});
    planet('Neptune',580,new T.Vector3(24000,4000,30000),std({map:band(['#3b63c9','#2f53b3','#4a73d6','#2b4aa3'])}),{atm:0x7aa0ff});
    planet('Pluto',70,new T.Vector3(-8000,14000,34000),std({map:band(['#cdb8a0','#a88f78','#e2d3c0'],1)}));
    var moonLbl=label('Moon');S.add(moonLbl);moonLbl.position.set(0,MR*.35,0);moonLbl.visible=false;
    /* reflections: a small sky is baked for space, for each planet and for Swarga, so metal and gold shine realistically */
    var pmrem=new T.PMREMGenerator(R),ENVS={};
    function envFor(key,top,mid,bot,sunI){if(ENVS[key])return ENVS[key];var sc=new T.Scene(),c=document.createElement('canvas');c.width=16;c.height=256;var x=c.getContext('2d'),g=x.createLinearGradient(0,0,0,256);g.addColorStop(0,top);g.addColorStop(.5,mid);g.addColorStop(1,bot);x.fillStyle=g;x.fillRect(0,0,16,256);
      sc.add(new T.Mesh(new T.SphereGeometry(50,32,16),new T.MeshBasicMaterial({side:T.BackSide,map:new T.CanvasTexture(c)})));
      if(sunI){var sm=new T.Mesh(new T.SphereGeometry(sunI,16,12),new T.MeshBasicMaterial({color:0xffffff}));sm.position.copy(SUNP).normalize().multiplyScalar(40);sc.add(sm);}
      return ENVS[key]=pmrem.fromScene(sc,.03).texture;}
    function hex(n){return '#'+new T.Color(n).getHexString();}
    S.environment=envFor('space','#06070c','#0b0c12','#030304',7);
    /* light from the Sun */
    var sun=new T.DirectionalLight(0xfff6e8,2.3);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);var sc=sun.shadow.camera;sc.left=sc.bottom=-60;sc.right=sc.top=60;sc.near=1;sc.far=400;sun.shadow.bias=-.0006;S.add(sun);S.add(sun.target);
    S.add(new T.HemisphereLight(0x7f9cff,0x222222,.1));
    var SUND=SUNP.clone().normalize();
    /* ---- the astronaut: a proper suit with helmet, gold visor, life-support pack, gloves and boots ---- */
    var A=new T.Group(),white=new T.MeshStandardMaterial({color:0xf4f4f0,roughness:.8}),grey=new T.MeshStandardMaterial({color:0x8c9099,roughness:.5,metalness:.3}),
        visor=new T.MeshStandardMaterial({color:0xe2a93a,metalness:1,roughness:.08}),redS=new T.MeshStandardMaterial({color:0xd3262b,roughness:.6}),blk=new T.MeshStandardMaterial({color:0x22252c,roughness:.6});
    function part(g,m,x,y,z,par){var o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;(par||A).add(o);return o;}
    var torso=new T.Group();torso.position.y=1.18;A.add(torso);
    part(new T.CylinderGeometry(.33,.29,.56,24),white,0,0,0,torso);part(new T.SphereGeometry(.33,24,12,0,Math.PI*2,0,Math.PI/2),white,0,.28,0,torso).scale.y=.55;part(new T.SphereGeometry(.29,24,12),white,0,-.28,0,torso).scale.y=.45;
    part(new T.BoxGeometry(.3,.22,.1),grey,0,.05,.31,torso);[[-.08,0xd3262b],[0,0x2fbf5b],[.08,0x2f7fe0]].forEach(function(q){part(new T.CylinderGeometry(.025,.025,.03,10),new T.MeshStandardMaterial({color:q[1],emissive:q[1],emissiveIntensity:.6}),q[0],.08,.37,torso).rotation.x=Math.PI/2;});
    part(new T.BoxGeometry(.5,.72,.24),white,0,.1,-.36,torso);part(new T.BoxGeometry(.52,.1,.26),grey,0,.46,-.36,torso);part(new T.CylinderGeometry(.05,.05,.3,10),grey,.18,.5,-.36,torso);
    [-1,1].forEach(function(sd){part(new T.SphereGeometry(.15,16,12),white,.38*sd,.25,0,torso);var h=part(new T.TorusGeometry(.2,.022,8,20,Math.PI),grey,.16*sd,.3,-.12,torso);h.rotation.y=Math.PI/2;});
    part(new T.TorusGeometry(.2,.035,10,24),grey,0,1.56,0).rotation.x=Math.PI/2;
    part(new T.SphereGeometry(.3,32,24),white,0,1.8,0);var vz=part(new T.SphereGeometry(.262,32,24,0,Math.PI*2,0,Math.PI*.62),visor,0,1.8,.07);vz.rotation.x=Math.PI/2.15;
    function limb(x,y,len,w,foot){var g=new T.Group();g.position.set(x,y,0);var h=len/2;
      [[-h/2,w],[-h*1.5,w*.92]].forEach(function(q){var m=new T.Mesh(new T.CylinderGeometry(q[1],q[1]*.94,h,14),white);m.position.y=q[0];m.castShadow=true;g.add(m);});
      var jt=new T.Mesh(new T.SphereGeometry(w*1.08,12,10),white);jt.position.y=-h;g.add(jt);var rg=new T.Mesh(new T.CylinderGeometry(w*1.06,w*1.06,.05,14),redS);rg.position.y=-h*.45;g.add(rg);
      var cf=new T.Mesh(new T.CylinderGeometry(w*1.1,w*1.1,.06,14),grey);cf.position.y=-len+.04;g.add(cf);
      var e=foot?new T.Mesh(new T.BoxGeometry(w*1.9,.16,.36),grey):new T.Mesh(new T.SphereGeometry(w*1.15,12,10),blk);e.position.set(0,-len-(foot?.06:.06),foot?.07:0);e.castShadow=true;g.add(e);A.add(g);return g;}
    var armL=limb(-.44,1.5,.62,.1),armR=limb(.44,1.5,.62,.1),legL=limb(-.17,.9,.8,.135,1),legR=limb(.17,.9,.8,.135,1);
    var flame=new T.Mesh(new T.ConeGeometry(.12,.7,12),new T.MeshBasicMaterial({color:0xffb04a,transparent:true,opacity:.85}));flame.rotation.x=Math.PI;flame.position.set(0,.55,-.38);flame.visible=false;A.add(flame);
    var plight=new T.PointLight(0xffa050,0,8);plight.position.set(0,.5,-.4);A.add(plight);
    S.add(A);
    /* ---- the two bodies: the astronaut (space and planets) and a devotee in kurta and dhoti (Swarga Loka) ---- */
    var AST=new T.Group();while(A.children.length)AST.add(A.children[0]);A.add(AST);
    var BODY_AST={armL:armL,armR:armR,legL:legL,legR:legR,torso:torso,ty:1.18,g:AST};
    var HUM=new T.Group();HUM.visible=false;A.add(HUM);
    var skin=new T.MeshStandardMaterial({color:0xc68a5e,roughness:.65}),hair=new T.MeshStandardMaterial({color:0x1a1410,roughness:.8}),
        kurta=new T.MeshStandardMaterial({color:0xd4560f,roughness:.8}),dhoti=new T.MeshStandardMaterial({color:0xf6f2e6,roughness:.8}),
        zari=new T.MeshStandardMaterial({color:0xe6b84a,metalness:.7,roughness:.3}),tilakM=new T.MeshBasicMaterial({color:0xfff6dc});
    function hp(g,m,x,y,z,par){var o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;(par||HUM).add(o);return o;}
    var hTorso=new T.Group();hTorso.position.y=1.28;HUM.add(hTorso);var kt=new T.Mesh(new T.LatheGeometry(new T.SplineCurve([[.08,.32],[.22,.27],[.235,.12],[.21,-.1],[.22,-.3],[.3,-.6],[.31,-.63]].map(function(q){return new T.Vector2(q[0],q[1]);})).getPoints(24),28),kurta);kt.scale.z=.74;kt.castShadow=true;hTorso.add(kt);kurta.side=T.DoubleSide;
    var kz=hp(new T.TorusGeometry(.305,.018,6,28),zari,0,.66,0);kz.rotation.x=Math.PI/2;kz.scale.y=.74;
    hp(new T.CylinderGeometry(.08,.09,.12,10),skin,0,1.64,0);
    var hHead=new T.Mesh(new T.SphereGeometry(.2,32,24),new T.MeshStandardMaterial({map:faceTex(0xc68a5e,false),roughness:.55}));hHead.scale.set(.9,1.1,.98);hHead.position.y=1.83;hHead.castShadow=true;HUM.add(hHead);
    var hh=hp(new T.SphereGeometry(.212,28,20,Math.PI*.93,Math.PI*1.14),hair,0,1.83,0);hh.scale.set(.93,1.12,1.02);var hh2=hp(new T.SphereGeometry(.214,28,14,0,Math.PI*2,0,Math.PI*.36),hair,0,1.835,-.012);hh2.scale.set(.93,1.1,1.02);hh2.rotation.x=-.28;
    hp(new T.SphereGeometry(.07,10,8),hair,0,1.8,-.2);
    hp(new T.BoxGeometry(.022,.075,.01),tilakM,0,1.93,.19);
    var scarf=hp(new T.BoxGeometry(.1,.85,.36),dhoti,.12,1.3,0);scarf.rotation.z=.55;scarf.scale.z=1.02;
    hp(new T.TorusGeometry(.13,.012,6,24),new T.MeshStandardMaterial({color:0xf2efe6}),0,1.58,.03).rotation.x=Math.PI/2.3;
    function hl(x,y,len,w,m,end){var g=new T.Group();g.position.set(x,y,0);var c=new T.Mesh(new T.CylinderGeometry(w,w*.92,len,12),m);c.position.y=-len/2;c.castShadow=true;g.add(c);
      var e=new T.Mesh(end==='foot'?new T.BoxGeometry(.13,.07,.26):new T.SphereGeometry(w*.95,10,8),skin);e.position.set(0,-len-(end==='foot'?.02:.02),end==='foot'?.05:0);e.castShadow=true;g.add(e);HUM.add(g);return g;}
    var hArmL=hl(-.36,1.55,.6,.085,kurta,'hand'),hArmR=hl(.36,1.55,.6,.085,kurta,'hand'),hLegL=hl(-.14,.86,.8,.15,dhoti,'foot'),hLegR=hl(.14,.86,.8,.15,dhoti,'foot');
    var BODY_HUM={armL:hArmL,armR:hArmR,legL:hLegL,legR:hLegR,torso:hTorso,ty:1.28,g:HUM},TY=1.18;
    function useBody(b){AST.visible=b===BODY_AST;HUM.visible=b===BODY_HUM;armL=b.armL;armR=b.armR;legL=b.legL;legR=b.legR;torso=b.torso;TY=b.ty;}
    /* soft temple bells, made in the browser */
    var ACX=null;function chime(notes){try{ACX=ACX||new (window.AudioContext||window.webkitAudioContext)();if(ACX.state==='suspended')ACX.resume();var t0=ACX.currentTime;
      (notes||[880,1320,1760]).forEach(function(f,k){var o=ACX.createOscillator(),g=ACX.createGain();o.type='sine';o.frequency.value=f;g.gain.setValueAtTime(0,t0+k*.12);g.gain.linearRampToValueAtTime(.06,t0+k*.12+.01);g.gain.exponentialRampToValueAtTime(.0001,t0+k*.12+2.2);o.connect(g);g.connect(ACX.destination);o.start(t0+k*.12);o.stop(t0+k*.12+2.3);});}catch(e){}}
    /* ---- the NIKADI spaceship, mark II: lifting-body shuttle with delta wings, twin fins, three engines,
       retracting gear, navigation lights, headlights and an engine trail. Nose points to +z. ---- */
    var SH=new T.Group(),dark=new T.MeshStandardMaterial({color:0x2a3040,metalness:.85,roughness:.3}),gold=new T.MeshStandardMaterial({color:0xf2b21b,metalness:.9,roughness:.2}),
        red=new T.MeshStandardMaterial({color:0xe02a26,metalness:.4,roughness:.25}),blue=new T.MeshStandardMaterial({color:0x1b5fd8,metalness:.45,roughness:.25,side:T.DoubleSide}),white2=new T.MeshStandardMaterial({color:0xfafafa,metalness:.3,roughness:.25});
    function sp3(g,m,x,y,z,par){var o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;(par||SH).add(o);return o;}
    var hullTex=(function(){var c=document.createElement('canvas');c.width=512;c.height=1024;var x=c.getContext('2d');x.fillStyle='#f8f8f6';x.fillRect(0,0,512,1024);
      /* v runs tail (bottom) to nose (top) */
      x.fillStyle='#e02a26';x.fillRect(0,0,512,150);x.fillStyle='#f2b21b';x.fillRect(0,150,512,16);x.fillStyle='#1b5fd8';x.fillRect(0,166,512,10);
      x.fillStyle='#1b5fd8';x.fillRect(0,820,512,60);x.fillStyle='#f2b21b';x.fillRect(0,806,512,14);x.fillRect(0,880,512,10);x.fillStyle='#ff8a1f';x.fillRect(0,890,512,134);
      x.strokeStyle='rgba(60,70,90,.28)';x.lineWidth=2;for(var y=210;y<800;y+=74){x.beginPath();x.moveTo(0,y);x.lineTo(512,y);x.stroke();}for(var u=0;u<512;u+=64){x.beginPath();x.moveTo(u,176);x.lineTo(u,806);x.stroke();}
      /* cabin windows on both sides */
      [128,384].forEach(function(u){for(var k=0;k<5;k++){x.fillStyle='#16233f';x.beginPath();x.ellipse(u,330+k*52,15,19,0,0,7);x.fill();x.strokeStyle='#f2b21b';x.lineWidth=3;x.stroke();}});
      var t2=new T.CanvasTexture(c);t2.encoding=T.sRGBEncoding;t2.anisotropy=8;return t2;})();
    var prof=[[.5,-4.6],[.95,-4.4],[1.28,-3.4],[1.38,-1.2],[1.34,.8],[1.12,2.8],[.7,4.4],[.28,5.3],[0,5.6]].map(function(q){return new T.Vector2(q[0],q[1]);});
    var body=sp3(new T.LatheGeometry(new T.SplineCurve(prof).getPoints(40),40),new T.MeshStandardMaterial({map:hullTex,metalness:.35,roughness:.28}),0,2.2,0);body.rotation.x=Math.PI/2;body.scale.set(1.15,1,.86);
    var glass=sp3(new T.SphereGeometry(1,32,20),new T.MeshStandardMaterial({color:0x0c1c3a,metalness:1,roughness:.04,transparent:true,opacity:.92}),0,2.92,2.5);glass.scale.set(.72,.5,1.75);
    sp3(new T.TorusGeometry(.74,.05,8,32),gold,0,2.74,2.5).scale.set(1,2.35,1);SH.children[SH.children.length-1].rotation.x=Math.PI/2;
    function wingShape(pts,depth){var sh=new T.Shape();sh.moveTo(pts[0][0],pts[0][1]);for(var k=1;k<pts.length;k++)sh.lineTo(pts[k][0],pts[k][1]);var g=new T.ExtrudeGeometry(sh,{depth:depth,bevelEnabled:true,bevelSize:.04,bevelThickness:.04,bevelSegments:2});return g;}
    [-1,1].forEach(function(sd){var w=sp3(wingShape([[1.1,1.8],[5.4,-3.1],[5.4,-4.1],[1.1,-3.9]],.16),blue,0,2.05,0);w.rotation.x=Math.PI/2;w.scale.x=sd;
      var le=sp3(new T.BoxGeometry(.16,.2,6.5),gold,3.25*sd,1.97,-.65);le.rotation.y=-sd*Math.atan2(4.3,4.9);
      var wl=sp3(wingShape([[-3.0,0],[-4.3,1.5],[-4.7,1.5],[-4.2,0]],.12),red,5.4*sd,2.0,0);wl.rotation.y=-Math.PI/2;
      var fin=new T.Group();fin.position.set(.85*sd,3.0,0);fin.rotation.z=-sd*.32;SH.add(fin);var f1=sp3(wingShape([[-1.8,0],[-4.0,2.5],[-4.7,2.5],[-4.3,0]],.12),red,0,0,0,fin);f1.rotation.y=-Math.PI/2;
      sp3(new T.BoxGeometry(.16,.22,.8),gold,0,2.5,-4.35,fin);
      /* wing-root engine pods */
      var pod=sp3(new T.CylinderGeometry(.5,.62,2.6,20),dark,1.75*sd,1.95,-3.2);pod.rotation.x=Math.PI/2;sp3(new T.SphereGeometry(.5,16,12),red,1.75*sd,1.95,-1.9).scale.z=1.6;});
    /* engine nozzles with glowing rings */
    var ringM=new T.MeshBasicMaterial({color:0xffa23a}),NOZ=[[-1.75,1.95,-4.7,.55],[1.75,1.95,-4.7,.55],[0,2.25,-4.9,.8]];
    NOZ.forEach(function(q){var n=sp3(new T.CylinderGeometry(q[3]*.8,q[3],.9,24,1,true),dark,q[0],q[1],q[2]);n.rotation.x=Math.PI/2;n.material.side=T.DoubleSide;sp3(new T.TorusGeometry(q[3]*.86,.05,8,28),ringM,q[0],q[1],q[2]-.42);
      sp3(new T.CircleGeometry(q[3]*.78,24),new T.MeshBasicMaterial({color:0x3a1a08}),q[0],q[1],q[2]-.1).rotation.y=Math.PI;});
    /* NIKADI on both sides and on the wings */
    (function(){function decal(w,h){var c=document.createElement('canvas');c.width=1024;c.height=256;var x=c.getContext('2d');x.font='900 190px Arial Black,Arial,sans-serif';x.textAlign='center';x.textBaseline='middle';x.lineWidth=18;x.strokeStyle='#f2b21b';x.strokeText('NIKADI',512,135);x.fillStyle='#12296b';x.fillText('NIKADI',512,135);
      var tx=new T.CanvasTexture(c);tx.encoding=T.sRGBEncoding;tx.anisotropy=8;return new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshStandardMaterial({map:tx,transparent:true,roughness:.4,metalness:.1,polygonOffset:true,polygonOffsetFactor:-4}));}
      var l=decal(3.6,.9);l.position.set(-1.6,2.6,-1.8);l.rotation.y=-Math.PI/2;l.rotation.x=0;SH.add(l);var r2=decal(3.6,.9);r2.position.set(1.6,2.6,-1.8);r2.rotation.y=Math.PI/2;SH.add(r2);
      [-1,1].forEach(function(sd){var t1=decal(2.6,.65);t1.rotation.x=-Math.PI/2;t1.rotation.z=sd>0?-Math.PI/2:Math.PI/2;t1.position.set(3.1*sd,2.11,-2.6);SH.add(t1);});})();
    /* landing gear (folds away in flight) */
    var gear=new T.Group();SH.add(gear);[[0,3.4],[-1.7,-2.6],[1.7,-2.6]].forEach(function(q){sp3(new T.CylinderGeometry(.07,.07,1.1,8),dark,q[0],.75,q[1],gear);[-.16,.16].forEach(function(o){var wh=sp3(new T.CylinderGeometry(.26,.26,.14,16),new T.MeshStandardMaterial({color:0x15161a,roughness:.9}),q[0]+o,.26,q[1],gear);wh.rotation.z=Math.PI/2;});});
    /* lights */
    var navL=sp3(new T.SphereGeometry(.09,10,8),new T.MeshBasicMaterial({color:0xff2a2a}),-5.45,2.05,-3.6),navR=sp3(new T.SphereGeometry(.09,10,8),new T.MeshBasicMaterial({color:0x2aff5a}),5.45,2.05,-3.6),strobe=sp3(new T.SphereGeometry(.1,10,8),new T.MeshBasicMaterial({color:0xffffff}),0,1.25,0);
    var head=new T.SpotLight(0xfff4dc,0,260,.5,.5,1.2);head.position.set(0,2.2,5.4);head.target.position.set(0,-2,40);SH.add(head);SH.add(head.target);
    var fireM=new T.MeshBasicMaterial({color:0xffb347,transparent:true,opacity:.85,blending:T.AdditiveBlending,depthWrite:false});
    var fires=NOZ.map(function(q){var f=new T.Mesh(new T.ConeGeometry(q[3]*.75,3,16,1,true),fireM);f.rotation.x=-Math.PI/2;f.position.set(q[0],q[1],q[2]-1.9);SH.add(f);return f;});
    var shipLight=new T.PointLight(0xffa040,0,30);shipLight.position.set(0,2,-5.5);SH.add(shipLight);
    /* engine trail */
    var TRN=360,trP=new Float32Array(TRN*3),trC=new Float32Array(TRN*3),trL=new Float32Array(TRN),trI=0,trG=new T.BufferGeometry();trG.setAttribute('position',new T.BufferAttribute(trP,3));trG.setAttribute('color',new T.BufferAttribute(trC,3));
    var trTex=(function(){var c=document.createElement('canvas');c.width=c.height=64;var x=c.getContext('2d'),g=x.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,64,64);return new T.CanvasTexture(c);})();
    var trail=new T.Points(trG,new T.PointsMaterial({size:1.6,map:trTex,vertexColors:true,transparent:true,blending:T.AdditiveBlending,depthWrite:false}));trail.frustumCulled=false;S.add(trail);var trV=new T.Vector3();
    function shipFx(dt,pow){strobe.visible=(t%1.3)<.1;navL.visible=navR.visible=(t%1.3)<.65;
      var flying=mode==='ship'&&!shipLanded();gear.visible=!flying;head.intensity=mode==='ship'?1.8:0;
      if(pow>.05)for(var k=0;k<3;k++){var q=NOZ[k];trV.set(q[0]+(Math.random()-.5)*.3,q[1]+(Math.random()-.5)*.3,q[2]-1.2);SH.localToWorld(trV);trP[trI*3]=trV.x;trP[trI*3+1]=trV.y;trP[trI*3+2]=trV.z;trL[trI]=1;trI=(trI+1)%TRN;}
      for(var j=0;j<TRN;j++){if(trL[j]>0){trL[j]=Math.max(0,trL[j]-dt*.9);var l=trL[j];trC[j*3]=l;trC[j*3+1]=l*l*.6;trC[j*3+2]=l*l*l*.25;}}
      trG.attributes.position.needsUpdate=true;trG.attributes.color.needsUpdate=true;}
    S.add(SH);
    /* footprints and dust puffs */
    var puffs=[],pm=new T.MeshBasicMaterial({color:0xcfc9bf,transparent:true,opacity:.5,depthWrite:false}),pg=new T.SphereGeometry(.25,8,6);
    function puff(x,z,n,y0){for(var k=0;k<n;k++){var o=new T.Mesh(pg,pm.clone());o.position.set(x+(Math.random()-.5)*.4,(y0!=null?y0:groundAt(x,z,A.position.y))+.1,z+(Math.random()-.5)*.4);o.userData={v:new T.Vector3((Math.random()-.5)*1.2,.4+Math.random()*.8,(Math.random()-.5)*1.2),t:0};S.add(o);puffs.push(o);}}
    /* ---- small worlds on every planet (except the Earth, which takes you home, and the Sun) ---- */
    var MOONMAT=moonBall.material,MOONTEX=null,cur='Moon',curB=null;
    var WORLDS={
      Swarg:{g:9,fact:''},
      Moon:{g:3.1,ground:[.3,.3,.29],rock:0x8a8783,sky:0x000000,fog:null,cr:70,ha:14,float:1,fact:'Low gravity: jump high and float.'},
      Mercury:{g:4.6,ground:[.33,.29,.26],rock:0x7a6e64,sky:0x000000,fog:null,cr:110,ha:10,float:1,fact:'The closest planet to the Sun. Days are hot and nights are freezing.'},
      Venus:{g:6.5,ground:[.55,.38,.18],rock:0x8a5a2a,sky:0xc99a4a,fog:[0xc99a4a,40,320],cr:8,ha:26,fact:'Thick golden clouds and the hottest surface of any planet.'},
      Mars:{g:4.6,ground:[.52,.24,.12],rock:0x7a3a20,sky:0xd9a37a,fog:[0xd9a37a,90,520],cr:30,ha:30,dust:0xc07050,fact:'The red planet, with the tallest volcano in the solar system.'},
      Jupiter:{g:8,ground:[.62,.5,.38],rock:0xa07850,sky:0x8a6a48,fog:[0x9a7a58,60,380],cr:0,ha:40,dust:0xe0c8a0,bands:1,fact:'A giant made of gas. You are standing on a floating cloud island.'},
      Saturn:{g:6.5,ground:[.66,.58,.4],rock:0xb59a62,sky:0x1a1408,fog:[0x3a2e18,140,700],cr:0,ha:22,ring:1,fact:'Look up: the rings fill the sky.'},
      Uranus:{g:6,ground:[.48,.68,.7],rock:0x7aaab0,sky:0x6fb3bf,fog:[0x7fc3cf,90,520],cr:10,ha:18,dust:0xd8f4f8,fact:'An ice giant that spins on its side.'},
      Neptune:{g:7,ground:[.16,.28,.62],rock:0x2a4aa0,sky:0x1d3a8a,fog:[0x2a4aa8,80,460],cr:10,ha:18,dust:0xaecbff,fact:'The windiest planet, with storms faster than sound.'},
      Pluto:{g:1.6,ground:[.72,.63,.53],rock:0xa08a72,sky:0x000000,fog:null,cr:60,ha:12,float:1,fact:'A tiny icy world, with a heart-shaped plain of nitrogen ice.'}};
    var ringSky=new T.Mesh(new T.RingGeometry(900,1700,128),new T.MeshBasicMaterial({color:0xe3cfa0,transparent:true,opacity:.45,side:T.DoubleSide,depthWrite:false,fog:false}));ringSky.rotation.set(-1.1,0,.35);ringSky.position.set(0,300,-600);ringSky.visible=false;S.add(ringSky);
    function regen(name){var w=WORLDS[name];featFor(name);HA=w.ha;HO=name==='Moon'?0:(name.charCodeAt(0)*7.3+name.charCodeAt(1)*3.1);HS=w.bands?.006:.012;craters(w.cr,w.bands?0:1);
      for(var i=0;i<pa.count;i++){var x=pa.getX(i),z=pa.getZ(i),y=heightA(x,z);HG[i]=y;pa.setY(i,y);var g=1+(fbm(x*.05+9+HO,z*.05+3,3)-.5)*.6+(fbm(x*.4,z*.4,2)-.5)*.25,m=fbm(x*.006+40+HO,z*.006,3)<.42?.75:1;
        if(w.bands)m*=.82+.3*Math.sin(z*.05+fbm(x*.02,z*.02,3)*6);col[i*3]=w.ground[0]*g*m;col[i*3+1]=w.ground[1]*g*m;col[i*3+2]=w.ground[2]*g*m;}
      pa.needsUpdate=true;geo.attributes.color.needsUpdate=true;geo.computeVertexNormals();placeRocks();rm.color.setHex(w.rock);
      floaters.forEach(function(f){f.visible=!!w.float;});dust.material.color.setHex(w.dust||0xd8d4cc);dust.material.opacity=w.dust?.8:.55;
      S.background=new T.Color(w.sky);S.fog=w.fog?new T.Fog(w.fog[0],w.fog[1],w.fog[2]):null;ringSky.visible=!!w.ring;
      sky.visible=!w.fog;S.environment=w.fog?envFor(name,hex(w.sky),hex(w.fog[0]),hex(new T.Color(w.ground[0],w.ground[1],w.ground[2]).getHex()),5):envFor('space');buildActs(name);}
    var veil=document.getElementById('mwVeil'),banner=document.getElementById('mwWorld'),bTimer=0;
    function showBanner(t,sub){banner.innerHTML='<b>'+t+'</b><small>'+sub+'</small>';banner.hidden=false;void banner.offsetWidth;banner.classList.add('on');clearTimeout(bTimer);bTimer=setTimeout(function(){banner.classList.remove('on');setTimeout(function(){banner.hidden=true;},800);},4200);}
    var busyW=false;
    function landOn(B){if(busyW)return;busyW=true;veil.classList.add('on');setTimeout(function(){
      cur=B.name;curB=B;regen(B.name);B.m.visible=false;B.lb.visible=false;moonBall.material=B.m.material;moonLbl.visible=false;
      SH.position.set(PAD.x,height(PAD.x,PAD.z)+40,PAD.z);shipV=0;shipVy=-20;camPos.set(0,0,0);
      setTimeout(function(){veil.classList.remove('on');busyW=false;showBanner('Welcome to '+B.name,WORLDS[B.name].fact+' Press E after landing to walk.');},150);},700);}
    function leaveWorld(){if(busyW||!curB)return;busyW=true;veil.classList.add('on');var B=curB;setTimeout(function(){
      B.m.visible=true;B.lb.visible=true;moonBall.material=MOONMAT;cur='Moon';curB=null;regen('Moon');
      SH.position.copy(B.m.position).add(new T.Vector3(0,B.r*1.06+60,0));shipVy=40;camPos.set(0,0,0);
      setTimeout(function(){veil.classList.remove('on');busyW=false;showBanner('Back in space','Fly to another planet, or into the Earth to land in Mayapur.');},150);},700);}
    var tooHot=0;
    /* =====================================================================
       PLANET ACTIVITIES — every world has crystals to find and geysers that launch you;
       some have extras (floating islands, dust devils, volcanoes, ice spires, lightning, meteors).
       Change the numbers in ACTS to tune a world.
       ===================================================================== */
    var ACTS={
      Moon:{crystal:0x9fe8ff,geyser:0xbfe6ff,task:'Find the 12 glowing crystals hidden on the Moon.'},
      Mercury:{crystal:0xffc46b,geyser:0xffb070,meteors:1,task:'Meteors are falling. Find 12 sun-crystals.'},
      Venus:{crystal:0xffe27a,geyser:0xff7a2a,volcano:1,task:'Climb a volcano and ride its lava geyser. Find 12 golden crystals.'},
      Mars:{crystal:0xff5a3c,geyser:0xffa070,devils:1,rover:1,task:'Ride a dust devil up into the sky, then find 12 red crystals.'},
      Jupiter:{crystal:0xffd59a,geyser:0xfff0d0,islands:0xf3e4c8,storm:1,task:'Jump across the floating cloud islands. Find 12 crystals.'},
      Saturn:{crystal:0xfff2c0,geyser:0xfff6d8,islands:0xd9d4c8,ice:1,task:'Hop between the floating ring-ice. Find 12 crystals.'},
      Uranus:{crystal:0xbff8ff,geyser:0xdafcff,spires:0xbfeff4,task:'Ice geysers blast you up. Find 12 ice crystals.'},
      Neptune:{crystal:0x7fb2ff,geyser:0xa8c8ff,spires:0x6f8fe0,task:'Ride the ice geysers in the wind. Find 12 blue crystals.'},
      Pluto:{crystal:0xffffff,geyser:0xffffff,heart:1,task:'Bounce in super-low gravity across the heart glacier. Find 12 crystals.'}};
    function groundAt(x,z,y){if(cur==='Swarg')return swH(x,z);var h=height(x,z);if(plats.length){var pt=platTop(x,z,y);if(pt>h)h=pt;}return h;}
    var ACT=new T.Group();S.add(ACT);
    var ACTDATA={},crystals=[],geysers=[],plats=[],devils=[],cols=[],meteors=[],stormT=0,flash=null;
    var goalEl=document.getElementById('mwGoal');
    function rnd(seed){var s=seed;return function(){s=(s*16807)%2147483647;return s/2147483647;};}
    /* terrain features that change the ground itself (used by heightT) */
    function featFor(name){var r=rnd(name.length*999+7);FEAT=[];var a=ACTS[name]||{};
      if(a.volcano)for(var i=0;i<3;i++){var va=i*2.1+r();FEAT.push({x:Math.cos(va)*300,z:Math.sin(va)*300,r:110+r()*40,h:70+r()*30});}
      if(a.heart)HEART=1;else HEART=0;}
    function clearActs(){while(ACT.children.length){var o=ACT.children[0];ACT.remove(o);}crystals=[];geysers=[];plats=[];devils=[];cols=[];meteors=[];flash=null;goalEl.hidden=true;}
    function glowSprite(color,size){var c=document.createElement('canvas');c.width=c.height=64;var x=c.getContext('2d'),g=x.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.3,'rgba(255,255,255,.5)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,64,64);
      var s=new T.Sprite(new T.SpriteMaterial({map:new T.CanvasTexture(c),color:color,transparent:true,depthWrite:false,blending:T.AdditiveBlending}));s.scale.set(size,size,1);return s;}
    function buildActs(name){clearActs();var a=ACTS[name];if(!a)return;var r=rnd(name.length*7919+13),i;
      var D=ACTDATA[name]=ACTDATA[name]||{got:{}};
      /* floating islands / ring ice (stand on their flat tops) */
      if(a.islands){var im=new T.MeshStandardMaterial({color:a.islands,roughness:.9,flatShading:!!a.ice});
        var ang=r()*6,rad=46,top=0;
        for(i=0;i<20;i++){ang+=.36;rad+=1.5;var x=Math.cos(ang)*rad,z=Math.sin(ang)*rad,pr=6+r()*5;top=i?Math.max(top+3+r()*1.5,height(x,z)+4):height(x,z)+4;
          var m=new T.Mesh(a.ice?new T.DodecahedronGeometry(pr,0):new T.CylinderGeometry(pr,pr*.55,pr*.8,18),im);if(a.ice)m.scale.y=.35;
          m.position.set(x,top-(a.ice?pr*.3:pr*.4),z);m.castShadow=m.receiveShadow=true;ACT.add(m);plats.push({x:x,z:z,r:pr*.9,top:top,m:m,bob:r()*6});}}
      /* crystals */
      for(i=0;i<12;i++){var cx,cz,cy;if(plats.length&&i%3===0){var p=plats[Math.min(plats.length-1,4+i)];cx=p.x;cz=p.z;cy=p.top+1.4;}
        else{cx=(r()-.5)*HALF*1.6;cz=(r()-.5)*HALF*1.6;cy=height(cx,cz)+1.4;}
        if(D.got[i])continue;var g=new T.Group();g.position.set(cx,cy,cz);
        var cm=new T.Mesh(new T.OctahedronGeometry(.8,0),new T.MeshStandardMaterial({color:a.crystal,emissive:a.crystal,emissiveIntensity:.8,metalness:.2,roughness:.15,transparent:true,opacity:.92}));cm.scale.y=1.6;g.add(cm);
        g.add(glowSprite(a.crystal,5));ACT.add(g);crystals.push({i:i,g:g,y:cy});}
      /* geysers: step on the glowing ring and you are launched */
      for(i=0;i<8;i++){var gx2=(r()-.5)*HALF*1.5,gz2=(r()-.5)*HALF*1.5;if(FEAT.length&&i<FEAT.length){gx2=FEAT[i].x;gz2=FEAT[i].z;}var gy=height(gx2,gz2);
        var ring=new T.Mesh(new T.TorusGeometry(2.2,.25,8,32),new T.MeshBasicMaterial({color:a.geyser}));ring.rotation.x=Math.PI/2;ring.position.set(gx2,gy+.2,gz2);ACT.add(ring);
        var pN=160,pp=new Float32Array(pN*3);for(var k=0;k<pN;k++){pp[k*3]=(Math.random()-.5)*2;pp[k*3+1]=Math.random()*18;pp[k*3+2]=(Math.random()-.5)*2;}
        var pg2=new T.BufferGeometry();pg2.setAttribute('position',new T.BufferAttribute(pp,3));var jet=new T.Points(pg2,new T.PointsMaterial({color:a.geyser,size:.35,transparent:true,opacity:.7,depthWrite:false}));jet.position.set(gx2,gy,gz2);ACT.add(jet);
        geysers.push({x:gx2,z:gz2,y:gy,jet:jet,big:FEAT.length&&i<FEAT.length});}
      /* Mars dust devils */
      if(a.devils)for(i=0;i<4;i++){var dm=new T.Mesh(new T.CylinderGeometry(9,1.5,60,24,1,true),new T.MeshBasicMaterial({color:0xd08a60,transparent:true,opacity:.22,side:T.DoubleSide,depthWrite:false}));
        dm.position.set((r()-.5)*400,0,(r()-.5)*400);ACT.add(dm);devils.push({m:dm,a:r()*6,c:[dm.position.x,dm.position.z],rr:40+r()*60});}
      if(a.rover){var rv=new T.Group(),wm=new T.MeshStandardMaterial({color:0x2a2a2a}),bm=new T.MeshStandardMaterial({color:0xd8d8d8,metalness:.5,roughness:.4});
        var b1=new T.Mesh(new T.BoxGeometry(2.6,.6,3.4),bm);b1.position.y=1.2;rv.add(b1);var mast=new T.Mesh(new T.CylinderGeometry(.08,.08,1.6),bm);mast.position.set(.8,2.2,1);rv.add(mast);
        var cam2=new T.Mesh(new T.BoxGeometry(.5,.3,.3),bm);cam2.position.set(.8,3,1);rv.add(cam2);for(var w=0;w<6;w++){var wh=new T.Mesh(new T.CylinderGeometry(.42,.42,.3,16),wm);wh.rotation.z=Math.PI/2;wh.position.set(w<3?-1.4:1.4,.42,-1.2+(w%3)*1.2);rv.add(wh);}
        rv.position.set(30,height(30,40),40);rv.rotation.y=.6;rv.traverse(function(o){o.castShadow=true;});ACT.add(rv);cols.push({x:30,z:40,r:2.6});}
      /* Venus volcano lava glow */
      if(a.volcano)FEAT.forEach(function(F){var top=height(F.x,F.z);var lava=new T.Mesh(new T.CircleGeometry(F.r*.11,24),new T.MeshBasicMaterial({color:0xff5a1a}));lava.rotation.x=-Math.PI/2;lava.position.set(F.x,top+.3,F.z);ACT.add(lava);
        var gl=glowSprite(0xff6a2a,60);gl.position.set(F.x,top+10,F.z);ACT.add(gl);var pl=new T.PointLight(0xff6a2a,2,120);pl.position.set(F.x,top+8,F.z);ACT.add(pl);});
      /* ice spires */
      if(a.spires){var sm=new T.MeshStandardMaterial({color:a.spires,roughness:.2,metalness:.1,transparent:true,opacity:.9});
        for(i=0;i<40;i++){var sx2=(r()-.5)*HALF*1.7,sz2=(r()-.5)*HALF*1.7,sh=8+r()*30,sr=1+r()*3;var sp4=new T.Mesh(new T.ConeGeometry(sr,sh,6),sm);sp4.position.set(sx2,height(sx2,sz2)+sh/2-1,sz2);sp4.castShadow=true;ACT.add(sp4);cols.push({x:sx2,z:sz2,r:sr});}}
      if(a.storm){flash=new T.PointLight(0xeef2ff,0,2000);flash.position.set(0,300,0);ACT.add(flash);}
      if(a.meteors)for(i=0;i<6;i++){var mg=new T.Mesh(new T.CylinderGeometry(.1,1.2,40,8),new T.MeshBasicMaterial({color:0xffd9a0,transparent:true,opacity:.8,blending:T.AdditiveBlending,depthWrite:false}));mg.visible=false;ACT.add(mg);meteors.push({m:mg,t:r()*6});}
      setGoal(name);}
    function setGoal(name){var a=ACTS[name],D=ACTDATA[name];if(!a){goalEl.hidden=true;return;}var n=Object.keys(D.got).length;
      goalEl.innerHTML='<b>'+name+'</b> · '+(n>=12?'All 12 crystals found ✦':'Crystals '+n+' / 12')+'<small>'+a.task+'</small>';goalEl.hidden=false;}
    function platTop(x,z,y){var best=-1e9;for(var i=0;i<plats.length;i++){var p=plats[i];if(Math.hypot(x-p.x,z-p.z)<p.r&&y>=p.top-1.4&&p.top>best)best=p.top;}return best;}
    function pushOut(p,list,pr){for(var i=0;i<list.length;i++){var c=list[i],dx=p.x-c.x,dz=p.z-c.z,d=Math.hypot(dx,dz),m=c.r+(pr||.5);if(d<m&&d>1e-4&&(c.h==null||p.y<c.h)){p.x=c.x+dx/d*m;p.z=c.z+dz/d*m;}}}
    /* runs every frame while walking on a planet */
    function actsWalk(dt){if(!ACTS[cur])return;var P=A.position,a=ACTS[cur],D=ACTDATA[cur];
      crystals=crystals.filter(function(c){if(Math.hypot(P.x-c.g.position.x,P.z-c.g.position.z)<2.6&&Math.abs(P.y+1-c.y)<3){D.got[c.i]=1;ACT.remove(c.g);chime([1320,1760,2640]);puff(c.g.position.x,c.g.position.z,8,c.y-1.4);
        var n=Object.keys(D.got).length;setGoal(cur);if(n>=12)showBanner('All crystals found!','You explored every corner of '+cur+'. Fly to another planet, or up to Swarga Loka.');return false;}return true;});
      geysers.forEach(function(g){if(onGround&&Math.hypot(P.x-g.x,P.z-g.z)<2.6){vel.y=g.big?60:Math.sqrt(2*WORLDS[cur].g*(cur==='Pluto'?120:55));onGround=false;puff(P.x,P.z,14);chime([440,660]);}});
      devils.forEach(function(d){if(Math.hypot(P.x-d.m.position.x,P.z-d.m.position.z)<8&&P.y<d.m.position.y+55){vel.y=Math.min(vel.y+22*dt,14);onGround=false;vel.x+=(-(P.z-d.m.position.z))*dt*.5;vel.z+=(P.x-d.m.position.x)*dt*.5;}});
      pushOut(P,cols,.5);}
    /* runs every frame on a planet (animation) */
    function actsAnim(dt){if(!ACTS[cur])return;crystals.forEach(function(c){c.g.rotation.y+=dt*1.5;c.g.position.y=c.y+Math.sin(t*2+c.i)*.25;});
      geysers.forEach(function(g){var p=g.jet.geometry.attributes.position;for(var k=0;k<p.count;k++){var y=p.getY(k)+dt*(8+(k%7));if(y>18)y=0;p.setY(k,y);}p.needsUpdate=true;});
      devils.forEach(function(d){d.a+=dt*.15;d.m.position.x=d.c[0]+Math.cos(d.a)*d.rr;d.m.position.z=d.c[1]+Math.sin(d.a)*d.rr;d.m.position.y=height(d.m.position.x,d.m.position.z)+30;d.m.rotation.y+=dt*3;});
      if(flash){stormT-=dt;if(stormT<0){stormT=2+Math.random()*5;flash.intensity=6;flash.position.set(A.position.x+(Math.random()-.5)*400,300,A.position.z+(Math.random()-.5)*400);}else flash.intensity*=Math.pow(.02,dt);}
      meteors.forEach(function(m){m.t-=dt;if(m.t<0){m.t=2+Math.random()*4;m.m.visible=true;m.m.position.set(A.position.x+(Math.random()-.5)*500,260,A.position.z+(Math.random()-.5)*500);m.v=new T.Vector3((Math.random()-.5)*80,-140,(Math.random()-.5)*80);m.m.lookAt(m.m.position.clone().add(m.v));m.m.rotateX(Math.PI/2);}
        if(m.m.visible){m.m.position.addScaledVector(m.v,dt);if(m.m.position.y<height(m.m.position.x,m.m.position.z)){m.m.visible=false;puff(m.m.position.x,m.m.position.z,16);}}});}
    /* =====================================================================
       SWARGA LOKA — Amaravati, the city of Indradev, above the planets.
       Layout (metres, north is -z):
         landing ghat with the parked NIKADI ship ..... (0, 560)
         marble avenue with lamps ..................... x = 0, from z 540 to z -300
         Nandana Vana garden, Parijata trees, flowers . all around
         lotus ponds .................................. (110, 180) and (-130, 260)
         Kalpavriksha, the wish-fulfilling tree ....... (160, -60)
         apsaras' dance mandapa ....................... (-160, 40)
         golden torana gate ........................... (0, -300)
         Airavata, Indra's white elephant ............. (-34, -306)
         Vaijayanta palace, Sudharma court, throne .... centre (0, -400); Indradev at (0, -428)
       ===================================================================== */
    var SWDOT=null,SWR=700,SW=null,SWC=[],SWPOI=[],swDancers=[],swMusic=[],swPetals=null,swFount=[],swLamps=[],INDRA=null,AIR=null,PR={on:false,t:0},seen={};
    var PAL={x:0,z:-400},PRANAM={x:0,z:-408};
    function swBase(x,z){var d=Math.hypot(x,z),h=(fbm(x*.006+50,z*.006,3)-.5)*5+Math.sin(x*.02)*Math.cos(z*.017)*.6;
      if(Math.abs(x)<12)h*=Math.abs(x)/12;var dg=Math.hypot(x,z-560);if(dg<40)h*=dg/40;
      if(Math.abs(x)<95&&z<-270&&z>-500)h*=.1;
      var p1=Math.hypot(x-110,z-180),p2=Math.hypot(x+130,z-260);if(p1<46)h=Math.min(h,-1.2*(1-p1/46));if(p2<32)h=Math.min(h,-1.2*(1-p2/32));
      if(d>SWR-40)h-=Math.pow((d-SWR+40)/30,2)*4;return h;}
    function swH(x,z){var dz=z-PAL.z,ax=Math.abs(x),h=swBase(x,z);
      if(ax<80&&Math.abs(dz)<60)h=Math.max(h,1.2);if(ax<74&&Math.abs(dz)<54)h=Math.max(h,2.4);if(ax<68&&Math.abs(dz)<48)h=Math.max(h,3.6);
      if(ax<9&&dz<-21&&dz>-36)h=Math.max(h,4.8);
      if(Math.hypot(x,z-560)<28)h=Math.max(h,.6);if(Math.hypot(x+160,z-40)<22)h=Math.max(h,1.1);if(Math.hypot(x-160,z+60)<16)h=Math.max(h,.8);return h;}
    function mat(c,o){return new T.MeshStandardMaterial(Object.assign({color:c,roughness:.6,metalness:0},o||{}));}
    var GOLD=mat(0xe7b84a,{metalness:.85,roughness:.28,emissive:0x3a2405}),MARBLE=mat(0xf7f1e6,{roughness:.35}),ROSE=mat(0xf3d6d0,{roughness:.4}),
        RED=mat(0xb3262e,{roughness:.6}),SAFF=mat(0xf08a1c),LEAF=mat(0x2f7a3a,{roughness:.9}),LEAF2=mat(0x3f9a46,{roughness:.9});
    function M(g,m,x,y,z,par,noShadow){var o=new T.Mesh(g,m);o.position.set(x,y,z);if(!noShadow){o.castShadow=true;o.receiveShadow=true;}(par||SW).add(o);return o;}
    function canvasTex(w,h,fn){var c=document.createElement('canvas');c.width=w;c.height=h;fn(c.getContext('2d'),w,h);var t2=new T.CanvasTexture(c);t2.encoding=T.sRGBEncoding;return t2;}
    function inst(geo,m,list,shadow){var im=new T.InstancedMesh(geo,m,list.length),d=new T.Object3D();list.forEach(function(q,k){d.position.set(q[0],q[1],q[2]);d.rotation.set(q[4]||0,q[5]||0,q[6]||0);var s=q[3]||1;d.scale.set(s,(q[7]||1)*s,s);d.updateMatrix();im.setMatrixAt(k,d.matrix);});
      if(shadow){im.castShadow=true;im.receiveShadow=true;}SW.add(im);return im;}
    /* ---- people: apsaras, gandharvas, Indradev ---- */
    /* faces are painted (eyes, brows, lips, bindi) and wrapped on the head; bodies are smooth turned shapes with draped cloth */
    var FACES;
    function faceTex(skin,fem){if(!FACES)FACES={};var key=skin+'|'+fem;if(FACES[key])return FACES[key];return FACES[key]=canvasTex(512,256,function(x,w,h){var c=new T.Color(skin);x.fillStyle='#'+c.getHexString();x.fillRect(0,0,w,h);var cx=w*.25,cy=h*.5;
      var sh=x.createLinearGradient(cx-70,0,cx+70,0);sh.addColorStop(0,'rgba(60,30,15,.28)');sh.addColorStop(.3,'rgba(60,30,15,0)');sh.addColorStop(.7,'rgba(60,30,15,0)');sh.addColorStop(1,'rgba(60,30,15,.28)');x.fillStyle=sh;x.fillRect(cx-70,0,140,h);
      [-1,1].forEach(function(sd){var ex=cx+sd*21,ey=cy-8,g=x.createRadialGradient(cx+sd*27,cy+20,2,cx+sd*27,cy+20,22);g.addColorStop(0,'rgba(215,95,95,.3)');g.addColorStop(1,'rgba(215,95,95,0)');x.fillStyle=g;x.fillRect(cx-70,cy-10,140,70);
        x.fillStyle='rgba(70,40,25,.22)';x.beginPath();x.ellipse(ex,ey-1,14,9,0,0,7);x.fill();
        x.fillStyle='#fbf7f2';x.beginPath();x.moveTo(ex-11,ey);x.quadraticCurveTo(ex,ey-8,ex+11,ey);x.quadraticCurveTo(ex,ey+6,ex-11,ey);x.fill();
        x.fillStyle='#4a2c16';x.beginPath();x.arc(ex,ey-.5,5.2,0,7);x.fill();x.fillStyle='#0a0604';x.beginPath();x.arc(ex,ey-.5,2.6,0,7);x.fill();x.fillStyle='#fff';x.beginPath();x.arc(ex+1.8,ey-2.4,1.2,0,7);x.fill();
        x.strokeStyle='#0d0705';x.lineWidth=fem?3:2.2;x.beginPath();x.moveTo(ex-12,ey+.5);x.quadraticCurveTo(ex,ey-9,ex+12+(fem?sd*3:0),ey-(fem?2:0));x.stroke();
        x.lineWidth=fem?3:4;x.beginPath();x.moveTo(ex-sd*13,ey-15);x.quadraticCurveTo(ex,ey-22,ex+sd*15,ey-15);x.stroke();});
      x.strokeStyle='rgba(90,50,30,.4)';x.lineWidth=2;x.beginPath();x.moveTo(cx-5,cy+13);x.quadraticCurveTo(cx,cy+17,cx+5,cy+13);x.stroke();
      x.fillStyle=fem?'#be2b48':'#a55a4c';x.beginPath();x.moveTo(cx-11,cy+31);x.quadraticCurveTo(cx-5,cy+26,cx,cy+28.5);x.quadraticCurveTo(cx+5,cy+26,cx+11,cy+31);x.quadraticCurveTo(cx,cy+(fem?39:36),cx-11,cy+31);x.fill();
      x.strokeStyle='rgba(70,15,20,.55)';x.lineWidth=1;x.beginPath();x.moveTo(cx-11,cy+31);x.quadraticCurveTo(cx,cy+32.5,cx+11,cy+31);x.stroke();
      if(fem){x.fillStyle='#d81e2a';x.beginPath();x.arc(cx,cy-31,3.6,0,7);x.fill();}});}
    function lathe(pts,m,par,seg){var o=new T.Mesh(new T.LatheGeometry(new T.SplineCurve(pts.map(function(q){return new T.Vector2(q[0],q[1]);})).getPoints(26),seg||28),m);o.castShadow=true;par.add(o);return o;}
    function headOf(g,skin,fem,y){var hd=new T.Mesh(new T.SphereGeometry(.2,32,24),new T.MeshStandardMaterial({map:faceTex(skin,fem),roughness:.55}));hd.scale.set(.9,1.1,.98);hd.position.set(0,y,0);hd.castShadow=true;g.add(hd);
      var hm=mat(0x120c08,{roughness:.45}),hb=new T.Mesh(new T.SphereGeometry(.212,28,20,Math.PI*.93,Math.PI*1.14),hm);hb.scale.set(.93,1.12,1.02);hb.position.set(0,y,0);g.add(hb);
      var ht=new T.Mesh(new T.SphereGeometry(.214,28,14,0,Math.PI*2,0,Math.PI*.36),hm);ht.scale.set(.93,1.1,1.02);ht.position.set(0,y+.005,-.012);ht.rotation.x=-.28;g.add(ht);
      [-1,1].forEach(function(sd){var er=new T.Mesh(new T.SphereGeometry(.035,10,8),mat(skin));er.position.set(.178*sd,y-.01,0);er.scale.set(.5,1,.8);g.add(er);});return hd;}
    function armOf(g,sd,skin,y,sleeve){var a=new T.Group();a.position.set(.25*sd,y,0);var sk=mat(skin,{roughness:.6});
      var up=new T.Mesh(new T.CylinderGeometry(.058,.048,.32,12),sleeve||sk);up.position.y=-.16;up.castShadow=true;a.add(up);var sh=new T.Mesh(new T.SphereGeometry(.066,12,10),sleeve||sk);a.add(sh);
      var fo=new T.Group();fo.position.y=-.32;fo.rotation.x=-.35;a.add(fo);var lo=new T.Mesh(new T.CylinderGeometry(.046,.036,.3,12),sk);lo.position.y=-.15;lo.castShadow=true;fo.add(lo);var el=new T.Mesh(new T.SphereGeometry(.049,10,8),sk);fo.add(el);
      var hn=new T.Mesh(new T.SphereGeometry(.05,10,8),sk);hn.scale.set(.75,1.35,.5);hn.position.y=-.35;fo.add(hn);[-.24,-.27].forEach(function(by){var b=new T.Mesh(new T.TorusGeometry(.043,.011,6,16),GOLD);b.rotation.x=Math.PI/2;b.position.y=by;fo.add(b);});
      g.add(a);return a;}
    function person(o){var g=new T.Group(),skin=o.skin||0xd9a07a,sk=mat(skin,{roughness:.6}),fem=!!o.sari,lower;
      var head=headOf(g,skin,fem,1.83);lathe([[.06,1.74],[.062,1.64],[.075,1.6]],sk,g,14);
      if(fem){var silk=mat(o.sari,{roughness:.42,metalness:.12,side:T.DoubleSide}),bl=mat(o.top,{roughness:.5});
        lathe([[.07,1.6],[.17,1.55],[.19,1.45],[.185,1.36],[.15,1.27]],bl,g).scale.z=.78;lathe([[.15,1.27],[.135,1.17],[.15,1.08],[.185,1.0]],sk,g).scale.z=.8;
        lower=lathe([[.185,1.02],[.21,.94],[.22,.8],[.25,.55],[.33,.25],[.45,.03],[.47,0]],silk,g,36);lower.scale.z=.82;
        var hem=new T.Mesh(new T.TorusGeometry(.465,.022,6,40),GOLD);hem.rotation.x=Math.PI/2;hem.scale.y=.82;hem.position.y=.03;g.add(hem);var wb=new T.Mesh(new T.TorusGeometry(.187,.018,6,28),GOLD);wb.rotation.x=Math.PI/2;wb.scale.y=.82;wb.position.y=1.01;g.add(wb);
        /* pallu draped over the left shoulder, hanging down the back */
        var pc=new T.CatmullRomCurve3([new T.Vector3(.2,1.0,.1),new T.Vector3(.08,1.25,.17),new T.Vector3(-.12,1.5,.12),new T.Vector3(-.2,1.6,-.02),new T.Vector3(-.2,1.35,-.16),new T.Vector3(-.22,.85,-.2)]);
        var pl=new T.Mesh(new T.TubeGeometry(pc,30,.085,8),silk);pl.scale.set(1,1,.6);pl.castShadow=true;g.add(pl);
        /* braid, flowers in the hair, necklace, earrings */
        var br=new T.Mesh(new T.CylinderGeometry(.045,.025,.75,10),mat(0x120c08));br.position.set(0,1.42,-.2);br.rotation.x=.12;g.add(br);var gj=new T.Mesh(new T.TorusGeometry(.085,.03,8,20),mat(0xffffff,{emissive:0x444444}));gj.position.set(0,1.86,-.2);g.add(gj);
        [.115,.15].forEach(function(r2,k){var nk=new T.Mesh(new T.TorusGeometry(r2,.012,6,28),GOLD);nk.rotation.x=Math.PI/2+.5;nk.position.set(0,1.57-k*.05,.04+k*.02);g.add(nk);});
        [-1,1].forEach(function(sd){var e2=new T.Mesh(new T.ConeGeometry(.025,.07,8),GOLD);e2.position.set(.18*sd,1.74,0);g.add(e2);});
        var tk=new T.Mesh(new T.SphereGeometry(.018,8,6),GOLD);tk.position.set(0,1.97,.17);g.add(tk);}
      else{lathe([[.075,1.6],[.2,1.54],[.215,1.42],[.19,1.25],[.165,1.1],[.17,1.0]],sk,g).scale.z=.72;
        var dm3=mat(o.dhoti||0xf3e9c8,{roughness:.6,side:T.DoubleSide});lower=lathe([[.175,1.03],[.21,.92],[.215,.6],[.19,.3],[.16,.08],[.15,.05]],dm3,g,30);lower.scale.z=.8;
        var plt=new T.Mesh(new T.BoxGeometry(.1,.85,.06),dm3);plt.position.set(0,.55,.17);g.add(plt);var wb2=new T.Mesh(new T.TorusGeometry(.178,.022,6,28),GOLD);wb2.rotation.x=Math.PI/2;wb2.scale.y=.8;wb2.position.y=1.02;g.add(wb2);
        [-1,1].forEach(function(sd){var ft=new T.Mesh(new T.SphereGeometry(.07,10,8),sk);ft.scale.set(.8,.5,1.7);ft.position.set(.08*sd,.035,.06);g.add(ft);});
        if(o.sash){var sc2=new T.CatmullRomCurve3([new T.Vector3(.17,1.02,.1),new T.Vector3(0,1.3,.17),new T.Vector3(-.17,1.55,.06),new T.Vector3(-.19,1.5,-.1),new T.Vector3(-.2,1.0,-.16)]);var ss2=new T.Mesh(new T.TubeGeometry(sc2,24,.06,8),mat(o.sash,{roughness:.45,metalness:.15}));ss2.scale.set(1,1,.6);g.add(ss2);}
        [.13,.17].forEach(function(r2,k){var nk=new T.Mesh(new T.TorusGeometry(r2,.014,6,28),GOLD);nk.rotation.x=Math.PI/2+.5;nk.position.set(0,1.56-k*.07,.05+k*.03);g.add(nk);});}
      var arms=[armOf(g,-1,skin,1.52,fem?mat(o.top):null),armOf(g,1,skin,1.52,fem?mat(o.top):null)];
      if(o.crown){var cr=lathe([[.19,0],[.2,.05],[.15,.12],[.17,.2],[.1,.34],[.05,.5],[0,.56]],GOLD,g,24);cr.position.y=2.0;[0,1,2,3,4].forEach(function(k){var a=(k-2)*.5,j=new T.Mesh(new T.SphereGeometry(.03,8,6),mat(k%2?0x1f6fe0:0xd0103a,{emissive:k%2?0x08204a:0x500010,roughness:.2}));j.position.set(Math.sin(a)*.2,2.05,Math.cos(a)*.2);g.add(j);});
        [-1,1].forEach(function(sd){var e3=new T.Mesh(new T.SphereGeometry(.035,8,6),GOLD);e3.position.set(.185*sd,1.76,0);g.add(e3);});}
      if(o.tilak){var tl=new T.Mesh(new T.BoxGeometry(.022,.07,.01),mat(0xd81e2a,{emissive:0x400000}));tl.position.set(0,1.93,.19);g.add(tl);}
      g.traverse(function(q){if(q.isMesh)q.castShadow=true;});return {g:g,arms:arms,head:head,lower:lower};}
    function buildSwarg(){SW=new T.Group();S.add(SW);var i,k,r=rnd(1008);
      /* sky dome: deep blue to rose to gold, with a soft sun */
      var dome=new T.Mesh(new T.SphereGeometry(6000,48,32),new T.MeshBasicMaterial({side:T.BackSide,fog:false,depthWrite:false,map:canvasTex(16,512,function(x,w,h){var g=x.createLinearGradient(0,0,0,h);g.addColorStop(0,'#2a3f8f');g.addColorStop(.32,'#6f78c8');g.addColorStop(.44,'#f2b6c6');g.addColorStop(.5,'#ffe0a8');g.addColorStop(.56,'#fff2d6');g.addColorStop(1,'#fff6e8');x.fillStyle=g;x.fillRect(0,0,w,h);})}));SW.add(dome);
      var sunG=glowSprite(0xfff1c8,1400);sunG.position.set(1800,900,-3200);sunG.material.fog=false;SW.add(sunG);var sunD=glowSprite(0xffffff,260);sunD.position.copy(sunG.position);sunD.material.fog=false;SW.add(sunD);
      var hemi=new T.HemisphereLight(0xfff0e6,0xa89a84,.18);var DOT=SWDOT=canvasTex(64,64,function(x){x.fillStyle='#fff';x.beginPath();x.arc(32,32,30,0,7);x.fill();});SW.add(hemi);
      /* ground: cloud-soft meadow, marble where people walk */
      var gg=new T.PlaneGeometry(SWR*2+200,SWR*2+200,220,220);gg.rotateX(-Math.PI/2);var gp=gg.attributes.position,gcl=new Float32Array(gp.count*3);
      for(i=0;i<gp.count;i++){var x=gp.getX(i),z=gp.getZ(i),y=swBase(x,z);gp.setY(i,y);var n=fbm(x*.03,z*.03,3),c;
        var d=Math.hypot(x,z),path=Math.abs(x)<9&&z<545&&z>-300,plaza=Math.hypot(x,z-560)<30||Math.abs(x)<95&&z<-280&&z>-500;
        if(path||plaza)c=[.97,.93,.86];else if(d>SWR-60)c=[.98,.96,.96];else c=[.16+n*.1,.46+n*.16,.14+n*.06];
        if(Math.abs(x)>9&&Math.abs(x)<11&&path)c=[.92,.72,.28];
        gcl[i*3]=c[0];gcl[i*3+1]=c[1];gcl[i*3+2]=c[2];}
      gg.setAttribute('color',new T.BufferAttribute(gcl,3));gg.computeVertexNormals();var gdT=canvasTex(256,256,function(x){var d=x.createImageData(256,256);for(var q=0;q<65536;q++){var v2=150+Math.random()*105;d.data[q*4]=v2;d.data[q*4+1]=v2;d.data[q*4+2]=v2;d.data[q*4+3]=255;}x.putImageData(d,0,0);});gdT.wrapS=gdT.wrapT=T.RepeatWrapping;gdT.repeat.set(420,420);var gm=new T.Mesh(gg,new T.MeshStandardMaterial({vertexColors:true,map:gdT,bumpMap:gdT,bumpScale:.03,roughness:.9}));gm.receiveShadow=true;SW.add(gm);
      /* clouds all around the edge, and below */
      var cl=[];for(i=0;i<220;i++){var a=r()*Math.PI*2,rr=SWR-10+r()*160;cl.push([Math.cos(a)*rr,-8+r()*22,Math.sin(a)*rr,14+r()*26]);}
      inst(new T.SphereGeometry(1,16,12),mat(0xffffff,{roughness:1,emissive:0x3a3438}),cl);
      var cl2=[];for(i=0;i<60;i++){var a2=r()*Math.PI*2,r2=900+r()*1400;cl2.push([Math.cos(a2)*r2,-140+r()*120,Math.sin(a2)*r2,60+r()*90,0,0,0,.45]);}
      inst(new T.SphereGeometry(1,16,12),mat(0xfff4f0,{roughness:1,emissive:0x504548}),cl2);
      /* floating islands with little shrines, far away */
      for(i=0;i<10;i++){var ia=i/10*Math.PI*2+r()*.3,ir=1100+r()*500,ix=Math.cos(ia)*ir,iz=Math.sin(ia)*ir,iy=40+r()*260,isz=30+r()*40,isl=new T.Group();isl.position.set(ix,iy,iz);
        M(new T.ConeGeometry(isz,isz*1.4,9),mat(0x8b7a66,{flatShading:true}),0,-isz*.7,0,isl,1).rotation.x=Math.PI;M(new T.CylinderGeometry(isz,isz*.98,3,24),LEAF2,0,0,0,isl,1);
        M(new T.BoxGeometry(isz*.5,isz*.35,isz*.5),MARBLE,0,isz*.2,0,isl,1);M(new T.ConeGeometry(isz*.3,isz*.55,8),GOLD,0,isz*.64,0,isl,1);
        isl.userData.b=iy;isl.userData.ph=r()*6;SW.add(isl);swFount.push({isl:isl});}
      /* landing ghat */
      M(new T.CylinderGeometry(28,29,1.2,48),MARBLE,0,0,560);M(new T.TorusGeometry(27,.4,8,64),GOLD,0,.62,560).rotation.x=Math.PI/2;
      /* lotus emblem on the ghat */
      M(new T.CircleGeometry(10,32),new T.MeshStandardMaterial({map:canvasTex(256,256,function(x,w,h){x.translate(128,128);for(var p=0;p<16;p++){x.rotate(Math.PI/8);x.fillStyle=p%2?'#f2a7b8':'#e97f9c';x.beginPath();x.ellipse(0,-64,22,60,0,0,7);x.fill();}x.fillStyle='#f6c64a';x.beginPath();x.arc(0,0,28,0,7);x.fill();}),transparent:true}),0,.63,560).rotation.x=-Math.PI/2;
      /* the avenue: lamps and gold borders */
      var lp=[],fl=[];for(var z=520;z>-290;z-=30){[-13,13].forEach(function(x){lp.push([x,swH(x,z),z]);fl.push([x,swH(x,z)+4.3,z]);});}
      inst(new T.CylinderGeometry(.35,.5,4,10),GOLD,lp,1);
      fl.forEach(function(q){var s2=glowSprite(0xffc46a,2.6);s2.position.set(q[0],q[1],q[2]);SW.add(s2);swLamps.push(s2);SWC.push({x:q[0],z:q[2],r:.6});});
      /* Nandana Vana: branching trees with real leaf canopies and blossom, hedges, thousands of flowers and grass */
      var barkT=canvasTex(128,256,function(x,w,h){x.fillStyle='#6a4a34';x.fillRect(0,0,w,h);for(var q=0;q<260;q++){x.strokeStyle='rgba('+(30+r()*50|0)+','+(18+r()*30|0)+','+(10+r()*20|0)+','+(.25+r()*.4)+')';x.lineWidth=1+r()*2.5;var bx0=r()*w;x.beginPath();x.moveTo(bx0,r()*h);x.lineTo(bx0+(r()-.5)*8,r()*h);x.stroke();}});barkT.wrapS=barkT.wrapT=T.RepeatWrapping;barkT.repeat.set(2,3);
      function leafT(blos){return canvasTex(256,256,function(x,w,h){for(var q=0;q<150;q++){var lx=20+r()*216,ly=20+r()*216,d=Math.hypot(lx-128,ly-128);if(d>118)continue;x.save();x.translate(lx,ly);x.rotate(r()*6.28);var L=24+r()*14;
          x.fillStyle='hsl('+(96+r()*36|0)+','+(42+r()*22|0)+'%,'+(18+r()*24|0)+'%)';x.beginPath();x.moveTo(-L/2,0);x.quadraticCurveTo(0,-L*.32,L/2,0);x.quadraticCurveTo(0,L*.32,-L/2,0);x.fill();x.strokeStyle='rgba(210,235,150,.35)';x.lineWidth=1;x.beginPath();x.moveTo(-L/2,0);x.lineTo(L/2,0);x.stroke();x.restore();}
        if(blos)for(q=0;q<16;q++){var fx2=30+r()*196,fy2=30+r()*196;if(Math.hypot(fx2-128,fy2-128)>105)continue;for(var k2=0;k2<6;k2++){var a=k2/6*6.28;x.fillStyle='#fffdf6';x.beginPath();x.ellipse(fx2+Math.cos(a)*6,fy2+Math.sin(a)*6,5.5,3.2,a,0,7);x.fill();}x.fillStyle='#ff7a1a';x.beginPath();x.arc(fx2,fy2,3,0,7);x.fill();}});}
      var leafM=new T.MeshStandardMaterial({map:leafT(1),alphaTest:.5,side:T.DoubleSide,roughness:.75}),leafM2=new T.MeshStandardMaterial({map:leafT(0),alphaTest:.5,side:T.DoubleSide,roughness:.75});
      var flT=canvasTex(128,128,function(x){x.translate(64,64);for(var k2=0;k2<6;k2++){x.rotate(6.283/6);var g2=x.createLinearGradient(0,0,0,-56);g2.addColorStop(0,'#d8d8d8');g2.addColorStop(1,'#ffffff');x.fillStyle=g2;x.beginPath();x.ellipse(0,-32,17,27,0,0,7);x.fill();}x.fillStyle='#ffd23a';x.beginPath();x.arc(0,0,12,0,7);x.fill();x.fillStyle='#e08a10';x.beginPath();x.arc(0,0,6,0,7);x.fill();});
      var grT=canvasTex(128,128,function(x){for(var q=0;q<46;q++){var gx0=6+r()*116,gh0=50+r()*76,lean=(r()-.5)*40;x.fillStyle='hsl('+(88+r()*34|0)+','+(45+r()*25|0)+'%,'+(22+r()*26|0)+'%)';x.beginPath();x.moveTo(gx0-3,128);x.quadraticCurveTo(gx0+lean*.4,128-gh0*.6,gx0+lean,128-gh0);x.quadraticCurveTo(gx0+lean*.5,128-gh0*.5,gx0+3,128);x.fill();}});
      var D3=new T.Object3D(),CL=new T.Color();D3.rotation.order='YXZ';
      function put(im,k,x,y,z,sx,sy,rx,ry,rz){D3.position.set(x,y,z);D3.rotation.set(rx||0,ry||0,rz||0);D3.scale.set(sx,sy,sx);D3.updateMatrix();im.setMatrixAt(k,D3.matrix);}
      function freeSpot(x,z){if(Math.abs(x)<22&&z<560&&z>-300)return false;if(Math.hypot(x,z-560)<36)return false;if(Math.abs(x)<100&&z<-260)return false;if(Math.hypot(x-110,z-180)<52||Math.hypot(x+130,z-260)<38)return false;
        if(Math.hypot(x+160,z-40)<30||Math.hypot(x-160,z+60)<26)return false;return Math.hypot(x,z)<SWR-70;}
      var TS=[];for(i=0;i<300;i++){var tx=(r()-.5)*SWR*1.9,tz=(r()-.5)*SWR*1.9;if(freeSpot(tx,tz))TS.push([tx,swH(tx,tz),tz,.8+r()*.8]);}
      var bkM=new T.MeshStandardMaterial({map:barkT,bumpMap:barkT,bumpScale:.04,roughness:.95}),trunkI=new T.InstancedMesh(new T.CylinderGeometry(.3,.52,1,10),bkM,TS.length),brI=new T.InstancedMesh(new T.CylinderGeometry(.09,.2,1,7),bkM,TS.length*6),
          cardG=new T.PlaneGeometry(1,1),lfI=new T.InstancedMesh(cardG,leafM,TS.length*96),bi=0,li=0;
      TS.forEach(function(t,k){var ts=t[3],th=5.2*ts;put(trunkI,k,t[0],t[1]+th/2,t[2],ts,th);SWC.push({x:t[0],z:t[2],r:.6*ts});var tips=[[t[0],t[1]+th+1.2*ts,t[2]]];
        for(var b=0;b<6;b++){var az=b/6*6.28+r(),tilt=.75+r()*.45,bl=(3+r()*1.6)*ts,dx=Math.sin(az)*Math.sin(tilt),dy=Math.cos(tilt),dz=Math.cos(az)*Math.sin(tilt),by=t[1]+th*(.72+r()*.2);
          put(brI,bi++,t[0]+dx*bl/2,by+dy*bl/2,t[2]+dz*bl/2,ts,bl,tilt,az,0);tips.push([t[0]+dx*bl,by+dy*bl,t[2]+dz*bl]);}
        tips.forEach(function(p,q){var n2=q?12:24,rad=(q?1.7:2.6)*ts;for(var c=0;c<n2;c++){var u=r()*6.28,v=Math.acos(r()*2-1),rr=rad*(.4+r()*.6),sz=(2.2+r()*1.4)*ts;put(lfI,li++,p[0]+Math.sin(v)*Math.cos(u)*rr,p[1]+Math.cos(v)*rr*.7,p[2]+Math.sin(v)*Math.sin(u)*rr,sz,sz,r()*3,r()*6.28,r()*3);}});});
      lfI.count=li;brI.count=bi;[trunkI,brI,lfI].forEach(function(m){m.castShadow=true;m.receiveShadow=true;SW.add(m);});
      /* bushes and hedges: crossed leaf cards, with flowers on top */
      var BS=[];for(i=0;i<1100;i++){var bx=(r()-.5)*SWR*1.9,bz=(r()-.5)*SWR*1.9;if(freeSpot(bx,bz))BS.push([bx,swH(bx,bz),bz,.7+r()*1]);}
      for(var z2=520;z2>-290;z2-=2.4){[-18,18].forEach(function(x){BS.push([x+(r()-.5)*.6,swH(x,z2),z2,.75+r()*.25]);});}
      var buI=new T.InstancedMesh(cardG,leafM2,BS.length*4),ui=0;BS.forEach(function(b){for(var c=0;c<4;c++)put(buI,ui++,b[0],b[1]+b[3]*.55,b[2],b[3]*1.9,b[3]*1.5,(r()-.5)*.5,c*.785+r()*.3,0);});buI.castShadow=true;buI.receiveShadow=true;SW.add(buI);
      var FLC=[0xff6f96,0xff3a4e,0xffd23a,0xb46bff,0xffffff,0xff9a2a,0xff8fc7,0x7fd0ff],FL=[];
      BS.forEach(function(b){var c=FLC[(r()*FLC.length)|0];for(var q=0;q<7;q++)FL.push([b[0]+(r()-.5)*b[3]*1.5,b[1]+b[3]*(.75+r()*.6),b[2]+(r()-.5)*b[3]*1.5,.28+r()*.18,c]);});
      for(z2=524;z2>-292;z2-=.8){[-15.5,-16.5,15.5,16.5].forEach(function(x,q){FL.push([x+(r()-.5)*.5,swH(x,z2)+.28+r()*.12,z2+(r()-.5)*.5,.3+r()*.16,FLC[((z2/14|0)+q)&7]]);});}
      for(i=0;i<7000;i++){var wx=(r()-.5)*SWR*1.9,wz=(r()-.5)*SWR*1.9;if(freeSpot(wx,wz))FL.push([wx,swH(wx,wz)+.3+r()*.15,wz,.22+r()*.16,FLC[(fbm(wx*.02,wz*.02,2)*16|0)&7]]);}
      var flG=new T.PlaneGeometry(1,1);var flI=new T.InstancedMesh(flG,new T.MeshStandardMaterial({map:flT,alphaTest:.5,side:T.DoubleSide,roughness:.6}),FL.length);
      FL.forEach(function(f,k){put(flI,k,f[0],f[1]+f[3]*.4,f[2],f[3]*2.1,f[3]*2.1,-.5-r()*.7,r()*6.28,0);flI.setColorAt(k,CL.setHex(f[4]));});flI.instanceColor.needsUpdate=true;SW.add(flI);
      /* grass */
      var grG=new T.PlaneGeometry(1,1);grG.translate(0,.5,0);var GRN=36000,grI=new T.InstancedMesh(grG,new T.MeshStandardMaterial({map:grT,alphaTest:.35,side:T.DoubleSide,roughness:.9}),GRN),gk=0;
      for(i=0;i<GRN*1.6&&gk<GRN;i++){var gx1=(r()-.5)*SWR*1.9,gz1=(r()-.5)*SWR*1.9;if(Math.hypot(gx1,gz1)>SWR-50||(Math.abs(gx1)<11&&gz1<548&&gz1>-300)||Math.hypot(gx1,gz1-560)<30||(Math.abs(gx1)<82&&gz1<-338&&gz1>-462)||Math.hypot(gx1+160,gz1-40)<24||Math.hypot(gx1-160,gz1+60)<17||Math.hypot(gx1-110,gz1-180)<47||Math.hypot(gx1+130,gz1-260)<33)continue;var gs=.7+r()*.8;put(grI,gk++,gx1,swBase(gx1,gz1)-.04,gz1,gs*1.3,gs*.75,0,r()*6.28,0);}
      grI.count=gk;grI.receiveShadow=true;SW.add(grI);
      /* lotus ponds */
      [[110,180,46],[-130,260,32]].forEach(function(P){var wtr=M(new T.CircleGeometry(P[2],48),new T.MeshStandardMaterial({color:0x5fb8d8,roughness:.08,metalness:.3,transparent:true,opacity:.88}),P[0],-.35,P[1],SW,1);wtr.rotation.x=-Math.PI/2;
        M(new T.TorusGeometry(P[2],.8,8,64),MARBLE,P[0],-.1,P[1]).rotation.x=Math.PI/2;
        var pads=[],lot=[];for(k=0;k<P[2]*1.4;k++){var la=r()*Math.PI*2,lr=r()*P[2]*.9;pads.push([P[0]+Math.cos(la)*lr,-.28,P[1]+Math.sin(la)*lr,.8+r()*.9,0,r()*6,0,.06]);if(k%3===0)lot.push([P[0]+Math.cos(la)*lr,-.05,P[1]+Math.sin(la)*lr,.55+r()*.3]);}
        inst(new T.CylinderGeometry(1,1,1,16),mat(0x3f8f3a),pads);inst(new T.ConeGeometry(.8,1.1,8,1,true),mat(0xf39ab3,{side:T.DoubleSide,emissive:0x4a1022}),lot.map(function(q){return [q[0],q[1]+.4,q[2],q[3],Math.PI,0,0];}));
        inst(new T.SphereGeometry(.25,8,6),mat(0xffd04a,{emissive:0x553300}),lot.map(function(q){return [q[0],q[1]+.3,q[2],q[3]];}));
        SWPOI.push({x:P[0],z:P[1],r:P[2]+12,t:'Lotus pond',s:'Lotuses bloom all year in the gardens of Svarga.'});});
      /* fountains */
      [[0,-250],[-60,120],[60,320]].forEach(function(F){var fx=F[0]===0?40:F[0],fz=F[1];M(new T.CylinderGeometry(7,7.5,1.4,32),MARBLE,fx,swH(fx,fz)+.4,fz);M(new T.CylinderGeometry(1,1.4,4,16),GOLD,fx,swH(fx,fz)+2.6,fz);
        var N2=500,pp=new Float32Array(N2*3),pv=[];for(k=0;k<N2;k++){pv.push({t:Math.random()*1.6,a:Math.random()*Math.PI*2,s:2+Math.random()*2});}
        var g3=new T.BufferGeometry();g3.setAttribute('position',new T.BufferAttribute(pp,3));var pts=new T.Points(g3,new T.PointsMaterial({color:0xcfefff,size:.22,transparent:true,opacity:.85,depthWrite:false}));pts.position.set(fx,swH(fx,fz)+4.6,fz);SW.add(pts);swFount.push({p:pts,v:pv});SWC.push({x:fx,z:fz,r:7.6,h:swH(fx,fz)+1.2});});
      /* Kalpavriksha */
      var KT={x:160,z:-60},ky=swH(KT.x,KT.z);M(new T.CylinderGeometry(16,16.5,.8,48),MARBLE,KT.x,ky-.4,KT.z);M(new T.TorusGeometry(15.6,.35,8,64),GOLD,KT.x,ky+.02,KT.z).rotation.x=Math.PI/2;
      var trunk=M(new T.CylinderGeometry(1.8,3.2,20,14),mat(0xa47a3a,{metalness:.55,roughness:.35,emissive:0x2a1a05}),KT.x,ky+10,KT.z);
      for(k=0;k<7;k++){var ba=k/7*Math.PI*2,br=M(new T.CylinderGeometry(.5,1,12,8),mat(0xa47a3a,{metalness:.55,roughness:.35}),KT.x+Math.cos(ba)*4,ky+19,KT.z+Math.sin(ba)*4);br.rotation.set(Math.sin(ba)*.7,0,-Math.cos(ba)*.7);}
      var kc=[];for(k=0;k<26;k++){var ca=r()*Math.PI*2,cr=r()*10,cy2=ky+20+r()*10;kc.push([KT.x+Math.cos(ca)*cr,cy2,KT.z+Math.sin(ca)*cr,3+r()*3]);}
      inst(new T.IcosahedronGeometry(1,1),mat(0x6fbf4a,{emissive:0x1a3a0a,roughness:.7}),kc,1);
      var gem=[],gcol2=[];for(k=0;k<500;k++){var ga=r()*Math.PI*2,gr2=r()*13,gy2=ky+14+r()*18;gem.push(KT.x+Math.cos(ga)*gr2,gy2,KT.z+Math.sin(ga)*gr2);var gc=[[1,.85,.3],[1,.3,.4],[.5,.8,1],[1,1,1],[.7,1,.5]][k%5];gcol2.push(gc[0],gc[1],gc[2]);}
      var gg2=new T.BufferGeometry();gg2.setAttribute('position',new T.Float32BufferAttribute(gem,3));gg2.setAttribute('color',new T.Float32BufferAttribute(gcol2,3));SW.add(new T.Points(gg2,new T.PointsMaterial({size:.6,vertexColors:true,map:DOT,transparent:true,opacity:.95,blending:T.AdditiveBlending,depthWrite:false})));
      var kgl=glowSprite(0xfff0a0,70);kgl.position.set(KT.x,ky+24,KT.z);SW.add(kgl);SWC.push({x:KT.x,z:KT.z,r:3.4});
      SWPOI.push({x:KT.x,z:KT.z,r:34,t:'Kalpavriksha',s:'The wish-fulfilling tree that arose from the churning of the ocean, planted by Indra in Svarga.'});
      /* dance mandapa for the apsaras */
      var MD={x:-160,z:40},my=swH(MD.x,MD.z);M(new T.CylinderGeometry(22,23,1.1,48),ROSE,MD.x,my-.55,MD.z);
      for(k=0;k<12;k++){var pa2=k/12*Math.PI*2;M(new T.CylinderGeometry(.6,.7,10,12),MARBLE,MD.x+Math.cos(pa2)*20,my+5,MD.z+Math.sin(pa2)*20);M(new T.CylinderGeometry(.9,.9,.6,12),GOLD,MD.x+Math.cos(pa2)*20,my+10,MD.z+Math.sin(pa2)*20);SWC.push({x:MD.x+Math.cos(pa2)*20,z:MD.z+Math.sin(pa2)*20,r:.8});}
      M(new T.CylinderGeometry(22,22,1.2,48),MARBLE,MD.x,my+10.8,MD.z);var dm2=M(new T.SphereGeometry(16,32,16,0,Math.PI*2,0,Math.PI/2),GOLD,MD.x,my+11.2,MD.z);dm2.scale.y=.65;M(new T.SphereGeometry(1.2,12,10),GOLD,MD.x,my+22.5,MD.z);
      var SARI=[0xe0245e,0xf28c28,0x9b4dca,0x1fa3a3,0xe8c23a,0xd94141];
      for(k=0;k<8;k++){var ap=person({sari:SARI[k%6],top:SARI[(k+2)%6],skin:k%2?0xe0b08a:0xc98f66});ap.g.scale.setScalar(1.05);SW.add(ap.g);swDancers.push({p:ap,c:MD,r:9+(k%2)*5,a:k/8*Math.PI*2,y:my,sp:.35+(k%2)*.1});}
      SWPOI.push({x:MD.x,z:MD.z,r:40,t:'Apsaras of Indra’s court',s:'Urvashi, Menaka, Rambha and Tilottama are the celebrated dancers of Svarga.'});
      /* gandharvas playing music beside the mandapa */
      for(k=0;k<3;k++){var gn=person({dhoti:0xf3e0a8,top:0x2a6fd0,sash:0xe7b84a});var gx3=MD.x+26+k*3,gz3=MD.z-8+k*6;gn.g.position.set(gx3,swH(gx3,gz3),gz3);gn.g.rotation.y=-Math.PI/2;
        var inst2=new T.Group();M(new T.CylinderGeometry(.04,.04,1.6,6),mat(0x7a4a22),0,0,0,inst2);M(new T.SphereGeometry(.22,12,10),mat(0x9a6a32),0,.7,0,inst2);M(new T.SphereGeometry(.18,12,10),mat(0x9a6a32),0,-.7,0,inst2);inst2.position.set(.15,1.3,.25);inst2.rotation.z=.9;gn.g.add(inst2);
        SW.add(gn.g);swMusic.push(gn);}
      /* torana gate */
      var GZ=-300;[-12,12].forEach(function(x){M(new T.CylinderGeometry(1.4,1.7,22,16),GOLD,x,11,GZ);M(new T.SphereGeometry(1.8,16,12),GOLD,x,22.6,GZ);SWC.push({x:x,z:GZ,r:1.8});});
      M(new T.BoxGeometry(30,2,2),GOLD,0,19,GZ);var arch=M(new T.TorusGeometry(12,1,10,32,Math.PI),GOLD,0,19,GZ);arch.position.y=19;
      M(new T.BoxGeometry(34,1.2,2.4),RED,0,15.6,GZ);
      /* Airavata, the white elephant with many tusks */
      AIR=new T.Group();var EL=mat(0xf4f1ea,{roughness:.55});AIR.position.set(-34,0,-306);AIR.rotation.y=.35;
      var eb=M(new T.SphereGeometry(1,24,18),EL,0,4.4,0,AIR);eb.scale.set(2.6,2.3,3.6);
      [[-1.6,-2.2],[1.6,-2.2],[-1.6,2.2],[1.6,2.2]].forEach(function(q){M(new T.CylinderGeometry(.75,.85,3.4,14),EL,q[0],1.7,q[1],AIR);M(new T.CylinderGeometry(.9,.9,.3,14),GOLD,q[0],.3,q[1],AIR);});
      var eh=M(new T.SphereGeometry(1.7,24,18),EL,0,5.6,3.8,AIR);var ears=[-1,1].map(function(sd){var e=M(new T.SphereGeometry(1.6,16,12),EL,1.6*sd,5.8,3.3,AIR);e.scale.set(.18,1,.9);return e;});
      var trk=new T.Group();trk.position.set(0,5,5.2);AIR.add(trk);var tc=new T.CatmullRomCurve3([new T.Vector3(0,0,0),new T.Vector3(0,-1.2,.6),new T.Vector3(0,-2.6,.7),new T.Vector3(0,-3.6,.3)]);M(new T.TubeGeometry(tc,20,.42,10),EL,0,0,0,trk);
      for(k=0;k<3;k++)[-1,1].forEach(function(sd){var tu=M(new T.ConeGeometry(.16,2.2-k*.4,8),mat(0xfffbef,{roughness:.3}),(.55+k*.35)*sd,4.5-k*.25,5+k*.1,AIR);tu.rotation.set(1.9,0,sd*(.25+k*.25));});
      M(new T.BoxGeometry(4.2,.4,4.6),RED,0,6.7,-.2,AIR);M(new T.BoxGeometry(4.4,.2,4.8),GOLD,0,6.9,-.2,AIR);M(new T.BoxGeometry(3,1.4,3),GOLD,0,7.6,-.4,AIR);
      M(new T.BoxGeometry(2.6,1.6,.2),GOLD,0,6.6,4.6,AIR);[-1,1].forEach(function(sd){M(new T.SphereGeometry(.18,10,8),mat(0x15100c),.9*sd,6,5.1,AIR);});
      SW.add(AIR);AIR.userData={ears:ears,trk:trk};SWC.push({x:-34,z:-306,r:5.5});
      SWPOI.push({x:-34,z:-306,r:22,t:'Airavata',s:'Indra’s white elephant, born from the churning of the ocean, king of all elephants.'});
      /* ---- Vaijayanta palace ---- */
      var PY=3.6;[[160,1.2,120,.6],[148,1.2,108,1.8],[136,1.2,96,3]].forEach(function(q){M(new T.BoxGeometry(q[0],q[1],q[2]),MARBLE,PAL.x,q[3],PAL.z);M(new T.BoxGeometry(q[0]+.24,.3,q[2]+.24),GOLD,PAL.x,q[3]+.3,PAL.z);});
      /* red carpet to the throne */
      M(new T.BoxGeometry(8,.06,64),RED,0,PY+.04,PAL.z+10,SW,1);M(new T.BoxGeometry(8,.06,30),RED,0,.04,-312,SW,1);
      /* colonnade */
      var pil=[],cap=[];for(var px=-60;px<=60;px+=10){pil.push([px,PY+8,PAL.z+40]);pil.push([px,PY+8,PAL.z-40]);}for(var pz=-30;pz<=30;pz+=10){pil.push([-60,PY+8,PAL.z+pz]);pil.push([60,PY+8,PAL.z+pz]);}
      for(px=-40;px<=40;px+=20)for(pz=-20;pz<=20;pz+=20)if(Math.abs(px)>10)pil.push([px,PY+8,PAL.z+pz]);
      inst(new T.CylinderGeometry(1.1,1.3,16,16),MARBLE,pil,1);inst(new T.CylinderGeometry(1.7,1.7,.9,16),GOLD,pil.map(function(q){return [q[0],PY+15.8,q[2]];}),1);inst(new T.CylinderGeometry(1.7,1.7,.9,16),GOLD,pil.map(function(q){return [q[0],PY+.45,q[2]];}),1);
      pil.forEach(function(q){SWC.push({x:q[0],z:q[2],r:1.4,h:PY+16});});
      /* roof, cornice, small domed pavilions along the edge */
      M(new T.BoxGeometry(128,2.2,88),MARBLE,PAL.x,PY+17.3,PAL.z);M(new T.BoxGeometry(130,.8,90),GOLD,PAL.x,PY+18.7,PAL.z);
      var ch=[];for(px=-56;px<=56;px+=16){ch.push([px,PY+21,PAL.z+40]);ch.push([px,PY+21,PAL.z-40]);}for(pz=-24;pz<=24;pz+=16){ch.push([-60,PY+21,PAL.z+pz]);ch.push([60,PY+21,PAL.z+pz]);}
      inst(new T.SphereGeometry(2.2,16,10,0,Math.PI*2,0,Math.PI/2),GOLD,ch,1);inst(new T.CylinderGeometry(2.3,2.3,1.6,16),MARBLE,ch.map(function(q){return [q[0],q[1]-.9,q[2]];}),1);
      /* the great shikhara and four corner towers */
      function shikhara(h,rb,x,y,z){var pts=[];for(var j=0;j<=24;j++){var u=j/24;pts.push(new T.Vector2(rb*(1-Math.pow(u,1.6))*(1+.06*Math.sin(u*40))+.4,u*h));}var l=M(new T.LatheGeometry(pts,32),GOLD,x,y,z);
        M(new T.SphereGeometry(rb*.18,16,12),GOLD,x,y+h+rb*.1,z);M(new T.ConeGeometry(rb*.08,rb*.4,12),GOLD,x,y+h+rb*.4,z);return l;}
      shikhara(46,17,PAL.x,PY+19,PAL.z-6);[[-46,-28],[46,-28],[-46,26],[46,26]].forEach(function(q){shikhara(20,7,PAL.x+q[0],PY+19,PAL.z+q[1]);});
      var flag=M(new T.ConeGeometry(2.2,7,3),SAFF,PAL.x+3.4,PY+19+56,PAL.z-6);flag.rotation.z=-Math.PI/2;M(new T.CylinderGeometry(.12,.12,10),GOLD,PAL.x,PY+19+52,PAL.z-6);
      /* back wall of the Sudharma court with a golden mandala */
      M(new T.BoxGeometry(120,16,2),ROSE,PAL.x,PY+8,PAL.z-42);
      var mnd=M(new T.CircleGeometry(12,64),new T.MeshStandardMaterial({emissive:0x5a3a10,map:canvasTex(512,512,function(x,w,h){x.translate(256,256);x.fillStyle='#b8862c';x.beginPath();x.arc(0,0,250,0,7);x.fill();
        for(var ring2=0;ring2<5;ring2++){var n2=12+ring2*6,rr3=60+ring2*40;for(var p=0;p<n2;p++){x.save();x.rotate(p/n2*Math.PI*2);x.fillStyle=ring2%2?'#ffe08a':'#f6b24a';x.beginPath();x.ellipse(0,-rr3,10+ring2*2,26,0,0,7);x.fill();x.restore();}}x.fillStyle='#fff2c0';x.beginPath();x.arc(0,0,50,0,7);x.fill();})}),PAL.x,PY+9,PAL.z-40.9,SW,1);
      /* the throne of Indra */
      M(new T.BoxGeometry(18,1.2,13),GOLD,0,PY+.6,PAL.z-28);M(new T.BoxGeometry(18.4,.2,13.4),RED,0,PY+1.25,PAL.z-28);
      M(new T.BoxGeometry(5,1.6,3.4),GOLD,0,PY+2.2,PAL.z-29);M(new T.BoxGeometry(5.4,5.6,.6),GOLD,0,PY+4.6,PAL.z-30.8);
      var halo=M(new T.TorusGeometry(3.4,.35,12,48),mat(0xffd86a,{emissive:0xb07a18,metalness:.8,roughness:.2}),0,PY+6.8,PAL.z-31.2);
      var hglow=glowSprite(0xffe39a,16);hglow.position.set(0,PY+6.8,PAL.z-31);SW.add(hglow);
      M(new T.CylinderGeometry(.12,.12,9),GOLD,2.8,PY+5.5,PAL.z-29.5);var um=M(new T.ConeGeometry(3.6,1.6,24,1,true),mat(0xfaf6ea,{side:T.DoubleSide}),2.8,PY+10.4,PAL.z-29.5);
      SWC.push({x:0,z:PAL.z-28,r:7,h:PY+1.2});var cl1=new T.PointLight(0xffd9a0,1.4,140);cl1.position.set(0,PY+11,PAL.z-14);SW.add(cl1);var cl3=new T.PointLight(0xffe6c0,.9,160);cl3.position.set(0,PY+11,PAL.z+22);SW.add(cl3);
      /* Indradev, seated, holding the vajra */
      INDRA=person({skin:0xe3b07a,dhoti:0xf2c230,top:0xd8a032,sash:0xc4202a,crown:1,tilak:1});var ig=INDRA.g;ig.scale.setScalar(2.3);ig.position.set(0,PY+2.35,PAL.z-29.2);
      INDRA.lower.scale.y=.5;INDRA.lower.position.y=.52;
      [-1,1].forEach(function(sd){var th=M(new T.CylinderGeometry(.13,.12,.85,10),mat(0xf2c230),.15*sd,.62,.36,ig);th.rotation.x=Math.PI/2;var sh2=M(new T.CylinderGeometry(.11,.09,.7,10),mat(0xe3b07a),.15*sd,.25,.78,ig);});
      var vj=new T.Group();M(new T.CylinderGeometry(.04,.04,.5,8),GOLD,0,0,0,vj);[-1,1].forEach(function(sd){M(new T.ConeGeometry(.12,.3,6),GOLD,0,.32*sd,0,vj).rotation.x=sd<0?Math.PI:0;M(new T.TorusGeometry(.1,.025,6,12),GOLD,0,.2*sd,0,vj);});
      vj.position.set(0,-.62,.05);INDRA.arms[0].add(vj);INDRA.arms[0].rotation.x=-.9;INDRA.arms[1].rotation.x=-.5;SW.add(ig);
      SWPOI.push({x:0,z:PAL.z-20,r:26,t:'Indradev, king of the devas',s:'Seated in the Sudharma court of Vaijayanta palace, holding the vajra. Come close to offer dandavat pranam.'});
      SWPOI.push({x:0,z:PAL.z+55,r:40,t:'Vaijayanta palace',s:'The palace of Indra in Amaravati, the capital of Svarga.'});
      /* apsaras dancing in the court, on either side */
      for(k=0;k<4;k++){var ap2=person({sari:SARI[(k+3)%6],top:SARI[k%6],skin:0xdba57e});SW.add(ap2.g);swDancers.push({p:ap2,c:{x:k<2?-26:26,z:PAL.z-6},r:3,a:k*Math.PI,y:PY,sp:.5});}
      /* falling petals around you */
      var PN=1600,pp2=new Float32Array(PN*3),pc2=new Float32Array(PN*3);for(k=0;k<PN;k++){pp2[k*3]=(Math.random()-.5)*160;pp2[k*3+1]=Math.random()*40;pp2[k*3+2]=(Math.random()-.5)*160;var pk=Math.random()<.5;pc2[k*3]=1;pc2[k*3+1]=pk?.62:.92;pc2[k*3+2]=pk?.74:.86;}
      var pg3=new T.BufferGeometry();pg3.setAttribute('position',new T.BufferAttribute(pp2,3));pg3.setAttribute('color',new T.BufferAttribute(pc2,3));swPetals=new T.Points(pg3,new T.PointsMaterial({size:.16,vertexColors:true,map:DOT,alphaTest:.4,transparent:true,opacity:.9,depthWrite:false}));SW.add(swPetals);
      SWPOI.push({x:0,z:560,r:34,t:'Your NIKADI ship',s:'Parked at the landing ghat. Press E beside it to fly back to space.'});
      SW.visible=false;}
    /* ---- the golden gate to Swarga Loka, high above the planets ---- */
    var PORTALP=new T.Vector3(0,12000,-3000),portal=new T.Group();portal.position.copy(PORTALP);S.add(portal);
    (function(){var g1=new T.Mesh(new T.TorusGeometry(420,36,24,96),new T.MeshStandardMaterial({color:0xf2c04a,metalness:.9,roughness:.25,emissive:0x8a5a10}));portal.add(g1);
      var g2=new T.Mesh(new T.TorusGeometry(470,10,12,96),new T.MeshBasicMaterial({color:0xffe6a0}));portal.add(g2);
      var disc=new T.Mesh(new T.CircleGeometry(400,64),new T.MeshBasicMaterial({map:canvasTex(256,256,function(x,w,h){var g=x.createRadialGradient(128,128,0,128,128,128);g.addColorStop(0,'rgba(255,250,230,1)');g.addColorStop(.4,'rgba(255,214,150,.75)');g.addColorStop(.75,'rgba(255,170,200,.45)');g.addColorStop(1,'rgba(160,140,255,.15)');x.fillStyle=g;x.fillRect(0,0,w,h);}),transparent:true,side:T.DoubleSide,blending:T.AdditiveBlending,depthWrite:false}));portal.add(disc);
      for(var k=0;k<16;k++){var pt=new T.Mesh(new T.SphereGeometry(30,16,12),new T.MeshStandardMaterial({color:0xf39ab3,emissive:0x6a1a3a}));pt.scale.set(.5,1.6,.3);var a=k/16*Math.PI*2;pt.position.set(Math.cos(a)*520,Math.sin(a)*520,0);pt.rotation.z=a-Math.PI/2;portal.add(pt);}
      var lb2=label('Swarga Loka ✦',1);lb2.position.set(0,620,0);portal.add(lb2);var gl2=glowSprite(0xffe2a0,2600);portal.add(gl2);portal.userData.disc=disc;})();
    portal.lookAt(0,0,0);
    function swargBits(on){[ground,moonBall,ACT,dust,sky,halo,ringSky,portal,moonLbl].forEach(function(o){if(o)o.visible=!on&&(o!==ringSky||(WORLDS[cur]||{}).ring)&&o!==moonLbl;});
      ROCKS.forEach(function(o){o.visible=!on;});floaters.forEach(function(f){f.visible=!on&&!!(WORLDS[cur]||{}).float;});bodies.forEach(function(B){B.m.visible=!on;B.lb.visible=!on;});if(SW)SW.visible=on;}
    function enterSwarg(){if(busyW)return;busyW=true;veil.classList.add('on','gold');setTimeout(function(){
      if(!SW)buildSwarg();cur='Swarg';swargBits(true);clearActs();S.background=new T.Color(0xffe8d6);S.fog=new T.Fog(0xf3cfc8,700,3600);sun.color.setHex(0xfff0d8);sun.intensity=1.05;S.environment=envFor('swarg','#243a86','#b9968a','#3f6a3a',2.5);R.toneMappingExposure=.68;
      /* the ship parks itself on the landing ghat and you step out in kurta and dhoti */
      SH.position.set(0,swH(0,560)+.05,560);shipYaw=Math.PI;SH.rotation.set(0,shipYaw,0);shipV=0;shipVy=0;shipRoll=0;seen={};
      mode='walk';A.visible=true;useBody(BODY_HUM);help.classList.remove('ship');setHud();heading=Math.PI;A.rotation.y=heading;A.position.set(9,swH(9,548),548);vel.set(0,0,0);onGround=true;dist=8;yawOff=0;pitch=.14;camPos.set(0,0,0);
      setTimeout(function(){veil.classList.remove('on','gold');busyW=false;showBanner('Swarga Loka','Amaravati, the city of Indradev. Your ship is parked on the ghat. Walk north along the marble avenue to Vaijayanta palace.');chime([523,659,784,1047]);},200);},800);}
    function leaveSwarg(){if(busyW)return;busyW=true;veil.classList.add('on','gold');setTimeout(function(){
      cur='Moon';swargBits(false);regen('Moon');R.toneMappingExposure=.82;sun.color.setHex(0xfff6e8);sun.intensity=2.3;useBody(BODY_AST);
      SH.position.copy(PORTALP).add(new T.Vector3(0,-1300,0));shipVy=0;shipV=60;camPos.set(0,0,0);
      setTimeout(function(){veil.classList.remove('on','gold');busyW=false;showBanner('Back among the planets','Fly into any planet to explore it, or into the Earth to land in Mayapur.');},200);},800);}
    /* ---- dandavat pranam ---- */
    function nearIndra(){return cur==='Swarg'&&mode==='walk'&&Math.hypot(A.position.x-PRANAM.x,A.position.z-PRANAM.z)<9&&A.position.y>3;}
    function startPranam(){if(PR.on||!nearIndra())return;PR.on=true;PR.t=0;PR.done=false;heading=0;var dx=0-A.position.x,dz=(PAL.z-29)-A.position.z;heading=Math.atan2(dx,dz);vel.set(0,0,0);prompt.hidden=true;}
    function pranamAnim(dt){if(!PR.on)return;PR.t+=dt;var k=PR.t;var lie=k<1.2?k/1.2:k<5.2?1:k<6.6?1-(k-5.2)/1.4:0,e=lie*lie*(3-2*lie);
      HUM.rotation.x=e*Math.PI/2;HUM.position.y=e*.22;armL.rotation.x=-e*Math.PI;armR.rotation.x=-e*Math.PI;legL.rotation.x=0;legR.rotation.x=0;
      if(k>2.2&&!PR.done){PR.done=true;chime([392,523,659,784,1047,1319]);petalShower();showBanner('Indradev blesses you','Your dandavat pranam has been received in the court of Svarga. May your journey be auspicious.');}
      if(INDRA){var up=k>2.2&&k<7.5?Math.min(1,(k-2.2)/.8):Math.max(0,1-(k-7.5)/.8);INDRA.arms[1].rotation.x=-.5-up*1.9;INDRA.arms[1].rotation.z=-up*.25;}
      if(k>8.3){PR.on=false;HUM.rotation.x=0;HUM.position.y=0;}}
    var shower=null;
    function petalShower(){var N3=700,pp3=new Float32Array(N3*3),cc=new Float32Array(N3*3),vv2=[];for(var k=0;k<N3;k++){pp3[k*3]=A.position.x+(Math.random()-.5)*10;pp3[k*3+1]=A.position.y+12+Math.random()*12;pp3[k*3+2]=A.position.z+(Math.random()-.5)*10;var c=[[1,.5,.7],[1,.85,.3],[1,1,1],[1,.35,.35]][k%4];cc[k*3]=c[0];cc[k*3+1]=c[1];cc[k*3+2]=c[2];vv2.push(1.2+Math.random()*1.6);}
      if(shower)SW.remove(shower);var g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(pp3,3));g.setAttribute('color',new T.BufferAttribute(cc,3));shower=new T.Points(g,new T.PointsMaterial({size:.2,vertexColors:true,map:SWDOT,alphaTest:.4,transparent:true,depthWrite:false}));shower.userData.v=vv2;shower.userData.t=0;SW.add(shower);}
    /* ---- every frame in Swarga Loka ---- */
    function swargAnim(dt){if(cur!=='Swarg'||!SW)return;
      swDancers.forEach(function(d,k){d.a+=dt*d.sp;var g=d.p.g;g.position.set(d.c.x+Math.cos(d.a)*d.r,d.y,d.c.z+Math.sin(d.a)*d.r);g.rotation.y=-d.a+(Math.sin(t*1.3+k)*.6);
        d.p.arms[0].rotation.x=-1.6-Math.sin(t*2+k)*.9;d.p.arms[1].rotation.x=-1.6-Math.cos(t*2+k)*.9;d.p.arms[0].rotation.z=-.4;d.p.arms[1].rotation.z=.4;g.rotation.z=Math.sin(t*2.4+k)*.08;});
      swMusic.forEach(function(m,k){m.g.rotation.z=Math.sin(t*1.5+k)*.04;m.arms[1].rotation.x=-1.1+Math.sin(t*6+k)*.15;});
      swFount.forEach(function(f){if(f.isl){f.isl.position.y=f.isl.userData.b+Math.sin(t*.3+f.isl.userData.ph)*4;return;}var p=f.p.geometry.attributes.position;f.v.forEach(function(q,k){q.t+=dt;if(q.t>1.6){q.t=0;q.a=Math.random()*Math.PI*2;}var s=q.s*q.t;p.setXYZ(k,Math.cos(q.a)*s,q.t*6-q.t*q.t*4.6,Math.sin(q.a)*s);});p.needsUpdate=true;});
      swLamps.forEach(function(l,k){var s=2.4+Math.sin(t*8+k*1.7)*.25;l.scale.set(s,s,1);});
      if(AIR){AIR.userData.ears.forEach(function(e,k){e.rotation.y=Math.sin(t*1.4+k*Math.PI)*.25;});AIR.userData.trk.rotation.x=Math.sin(t*.9)*.25;}
      var pp=swPetals.geometry.attributes.position;for(var k=0;k<pp.count;k++){var y=pp.getY(k)-dt*(.8+(k%5)*.15);var x=pp.getX(k)+Math.sin(t+k)*dt*.6;if(y<-2)y=40;pp.setXYZ(k,x,y,pp.getZ(k));}pp.needsUpdate=true;swPetals.position.set(A.position.x,swH(A.position.x,A.position.z),A.position.z);
      if(shower){shower.userData.t+=dt;var sp5=shower.geometry.attributes.position;for(var j=0;j<sp5.count;j++){var yy=sp5.getY(j)-dt*shower.userData.v[j];var gh=swH(sp5.getX(j),sp5.getZ(j))+.05;sp5.setY(j,Math.max(gh,yy));}sp5.needsUpdate=true;if(shower.userData.t>14){SW.remove(shower);shower=null;}}
      pranamAnim(dt);
      if(mode==='walk'&&!PR.on)SWPOI.forEach(function(p){var d=Math.hypot(A.position.x-p.x,A.position.z-p.z);if(d<p.r&&!seen[p.t]){seen[p.t]=1;showBanner(p.t,p.s);}});}
    /* ---- the map: Swarga Loka and the planets (press M for a big map) ---- */
    var mapC=document.getElementById('mwMap'),mapX=mapC.getContext('2d'),mapBox=document.getElementById('mwMapBox');
    function drawMap(){var onW=cur==='Swarg'||curB||cur==='Moon'&&!inSpace();mapBox.hidden=!onW;if(!onW)return;var big=mapBox.classList.contains('big'),Wd=mapC.width,Hd=mapC.height,R2=cur==='Swarg'?SWR+40:HALF;
      function P(x,z){return [Wd/2+x/R2*Wd/2*.92,Hd/2+z/R2*Hd/2*.92];}
      mapX.clearRect(0,0,Wd,Hd);mapX.fillStyle='rgba(10,12,22,.72)';mapX.fillRect(0,0,Wd,Hd);
      if(cur==='Swarg'){mapX.fillStyle='rgba(90,160,80,.55)';mapX.beginPath();mapX.arc(Wd/2,Hd/2,Wd/2*.92*(SWR/R2),0,7);mapX.fill();
        mapX.fillStyle='#f4ecdc';var a=P(-9,545),b=P(9,-300);mapX.fillRect(a[0],b[1],b[0]-a[0],a[1]-b[1]);
        var pa3=P(-68,-448),pb=P(68,-352);mapX.fillStyle='#e7b84a';mapX.fillRect(pa3[0],pa3[1],pb[0]-pa3[0],pb[1]-pa3[1]);
        [[110,180,46],[-130,260,32]].forEach(function(q){var c=P(q[0],q[1]);mapX.fillStyle='#5fb8d8';mapX.beginPath();mapX.arc(c[0],c[1],q[2]/R2*Wd/2*.92,0,7);mapX.fill();});
        var lb3=[['Palace',0,-470],['Kalpavriksha',160,-60],['Apsaras',-160,40],['Lotus pond',110,180],['Airavata',-34,-306]];mapX.font=(big?13:9)+'px Inter,Arial,sans-serif';mapX.textAlign='center';
        [[160,-60,'#9ee06a'],[-160,40,'#f39ab3'],[-34,-306,'#ffffff']].forEach(function(q){var c=P(q[0],q[1]);mapX.fillStyle=q[2];mapX.beginPath();mapX.arc(c[0],c[1],big?6:3.5,0,7);mapX.fill();});
        lb3.forEach(function(q){var c=P(q[1],q[2]);mapX.fillStyle='#fff6dc';mapX.fillText(q[0],c[0],c[1]-(big?10:6));});}
      else{mapX.strokeStyle='rgba(255,255,255,.3)';mapX.strokeRect(Wd*.04,Hd*.04,Wd*.92,Hd*.92);var a2=ACTS[cur];crystals.forEach(function(c){var q=P(c.g.position.x,c.g.position.z);mapX.fillStyle='#'+new T.Color(a2?a2.crystal:0xffffff).getHexString();mapX.beginPath();mapX.arc(q[0],q[1],big?5:3,0,7);mapX.fill();});
        geysers.forEach(function(g){var q=P(g.x,g.z);mapX.strokeStyle='#bfe6ff';mapX.beginPath();mapX.arc(q[0],q[1],big?5:3,0,7);mapX.stroke();});}
      var s=P(SH.position.x,SH.position.z);mapX.fillStyle='#ffb347';mapX.beginPath();mapX.moveTo(s[0],s[1]-7);mapX.lineTo(s[0]-5,s[1]+5);mapX.lineTo(s[0]+5,s[1]+5);mapX.fill();mapX.fillStyle='#fff';mapX.font=(big?12:9)+'px Inter,Arial,sans-serif';mapX.textAlign='center';mapX.fillText('Ship',s[0],s[1]+(big?18:14));
      var me=P(A.position.x,A.position.z),hd=mode==='ship'?shipYaw:heading;mapX.save();mapX.translate(me[0],me[1]);mapX.rotate(-hd+Math.PI);mapX.fillStyle='#4ad0ff';mapX.beginPath();mapX.moveTo(0,-8);mapX.lineTo(-5,6);mapX.lineTo(5,6);mapX.fill();mapX.restore();
      document.getElementById('mwShipD').textContent=Math.round(Math.hypot(A.position.x-SH.position.x,A.position.z-SH.position.z))+' m';}
    function inSpace(){return mode==='ship'&&!curB&&cur==='Moon'&&(Math.abs(SH.position.x)>HALF||Math.abs(SH.position.z)>HALF||SH.position.y>300);}
    document.getElementById('mwMapBtn').addEventListener('click',function(){mapBox.classList.toggle('big');var b=mapBox.classList.contains('big');mapC.width=mapC.height=b?520:180;});
    document.getElementById('mwGoShip').addEventListener('click',function(){if(mode!=='walk'||PR.on)return;var x=SH.position.x+Math.cos(shipYaw)*7.5,z=SH.position.z-Math.sin(shipYaw)*7.5;A.position.set(x,groundAt(x,z,0),z);vel.set(0,0,0);onGround=true;camPos.set(0,0,0);});
    /* ---- state ---- */
    var mode,heading,vel=new T.Vector3(),onGround,fuel,shipYaw,shipV,shipVy,shipRoll,ending;
    function reset(){useBody(BODY_AST);if(cur!=='Moon'){if(curB){curB.m.visible=true;curB.lb.visible=true;}moonBall.material=MOONMAT;cur='Moon';curB=null;regen('Moon');}mode='walk';heading=0;vel.set(0,0,0);onGround=true;fuel=1;A.visible=true;A.position.set(0,height(0,8),8);A.rotation.set(0,0,0);
      shipYaw=-.6;shipV=0;shipVy=0;shipRoll=0;ending=false;SH.position.set(PAD.x,height(PAD.x,PAD.z)+.05,PAD.z);SH.rotation.set(0,shipYaw,0);camPos.set(0,0,0);setHud();}
    /* ---- input ---- */
    var K={},yawOff=0,pitch=.14,dist=8,drag=null,t=0,step=0,last=performance.now();
    var KEYS=['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' ','Shift','w','a','s','d','e','z','x','m'];var mapTick=0;
    function interact(){if(nearIndra()){startPranam();return;}toggleShip();}
    function key(e,d){if(!open)return;var k=e.key.length===1?e.key.toLowerCase():e.key;if(KEYS.indexOf(k)<0)return;e.preventDefault();if(d&&k==='e'&&!K.e)interact();if(d&&k==='m'&&!K.m)document.getElementById('mwMapBtn').click();K[k]=d;}
    addEventListener('keydown',function(e){key(e,true);});addEventListener('keyup',function(e){key(e,false);});addEventListener('blur',function(){K={};});
    var cv=R.domElement;cv.addEventListener('pointerdown',function(e){drag=[e.clientX,e.clientY];cv.setPointerCapture(e.pointerId);});
    cv.addEventListener('pointermove',function(e){if(!drag)return;yawOff-=(e.clientX-drag[0])*.005;pitch=Math.max(-.6,Math.min(1.25,pitch+(e.clientY-drag[1])*.004));drag=[e.clientX,e.clientY];});
    cv.addEventListener('pointerup',function(){drag=null;});cv.addEventListener('wheel',function(e){e.preventDefault();dist=Math.max(3,Math.min(60,dist*(e.deltaY>0?1.1:.9)));},{passive:false});
    addEventListener('resize',function(){if(!open)return;cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix();R.setSize(innerWidth,innerHeight);});
    var fuelEl=document.getElementById('mwFuel'),altEl=document.getElementById('mwAlt'),hudL=document.getElementById('mwHudL'),help=document.getElementById('mwHelp'),prompt=document.getElementById('mwPrompt'),moved=0;
    var camPos=new T.Vector3(),look=new T.Vector3(),tmp=new T.Vector3();
    function nearShip(){return Math.hypot(A.position.x-SH.position.x,A.position.z-SH.position.z)<10&&Math.abs(A.position.y-SH.position.y)<5;}
    function shipLanded(){var x=SH.position.x,z=SH.position.z;if(cur==='Swarg')return Math.hypot(x,z)<SWR&&SH.position.y-swH(x,z)<1.5;return Math.abs(x)<HALF*.86&&Math.abs(z)<HALF*.86&&SH.position.y-height(x,z)<1.5;}
    function toggleShip(){if(ending||PR.on||busyW)return;if(mode==='walk'&&nearShip()){mode='ship';A.visible=false;dist=Math.max(dist,16);help.classList.add('ship');}
      else if(mode==='ship'&&shipLanded()){mode='walk';A.visible=true;heading=shipYaw;var sx=Math.cos(shipYaw)*7.5,sz=-Math.sin(shipYaw)*7.5;A.position.set(SH.position.x+sx,groundAt(SH.position.x+sx,SH.position.z+sz,0),SH.position.z+sz);vel.set(0,0,0);dist=8;help.classList.remove('ship');}
      setHud();}
    prompt.addEventListener('click',function(){interact();});
    function setHud(){hudL.textContent=mode==='ship'?'Fuel':'Jetpack';}
    /* ---- welcome to Mayapur ---- */
    var wel=document.getElementById('mwWelcome');
    function landEarth(){if(ending)return;ending=true;K={};wel.hidden=false;void wel.offsetWidth;wel.classList.add('on');
      setTimeout(function(){wel.classList.add('out');},3600);
      setTimeout(function(){hide();wel.classList.remove('on','out');wel.hidden=true;reset();scrollTo({top:0,behavior:'smooth'});},4600);}
    function frame(now){if(!open)return;raf=requestAnimationFrame(frame);var dt=Math.min(.05,(now-last)/1000);last=now;t+=dt;
      var fw=(K.ArrowUp||K.w?1:0)-(K.ArrowDown||K.s?1:0),tn=(K.ArrowLeft||K.a?1:0)-(K.ArrowRight||K.d?1:0),run=K.Shift,focus;
      if(ending){fw=tn=0;}
      if(mode==='walk'){
        var SWG=cur==='Swarg',speed=SWG?(run?15:6):(run?9:4);if(PR.on){fw=tn=0;}heading+=tn*dt*(run?2.2:2.6);
        var tx=Math.sin(heading)*fw*speed,tz=Math.cos(heading)*fw*speed,ctl=onGround?10:2.2;
        vel.x+=(tx-vel.x)*Math.min(1,ctl*dt);vel.z+=(tz-vel.z)*Math.min(1,ctl*dt);
        if(K[' ']&&!PR.on){if(onGround){vel.y=SWG?6.5:5.2;onGround=false;puff(A.position.x,A.position.z,6);}else if(!SWG&&fuel>0&&vel.y<6){vel.y+=(WORLDS[cur].g+4.5)*dt;fuel=Math.max(0,fuel-dt*.22);}}
        vel.y-=WORLDS[cur].g*dt;A.position.addScaledVector(vel,dt);
        if(SWG){var rd=Math.hypot(A.position.x,A.position.z);if(rd>SWR-30){A.position.x*=(SWR-30)/rd;A.position.z*=(SWR-30)/rd;}pushOut(A.position,SWC,.5);}
        else{var lim=HALF*.86;A.position.x=Math.max(-lim,Math.min(lim,A.position.x));A.position.z=Math.max(-lim,Math.min(lim,A.position.z));}
        var gh=groundAt(A.position.x,A.position.z,A.position.y);
        if(A.position.y<=gh){if(!onGround&&vel.y<-2)puff(A.position.x,A.position.z,10);A.position.y=gh;vel.y=0;onGround=true;}else if(A.position.y>gh+.35)onGround=false;
        /* do not walk through the ship */
        var dsx=A.position.x-SH.position.x,dsz=A.position.z-SH.position.z,dd=Math.hypot(dsx,dsz);if(dd<5&&A.position.y<SH.position.y+3.5){A.position.x=SH.position.x+dsx/dd*5;A.position.z=SH.position.z+dsz/dd*5;}
        if(onGround)fuel=Math.min(1,fuel+dt*.25);
        var thr=!SWG&&!onGround&&K[' ']&&fuel>0;flame.visible=thr;plight.intensity=thr?2.5:0;if(thr)flame.scale.y=.8+Math.random()*.5;
        A.rotation.y+=((heading-A.rotation.y+Math.PI*3)%(Math.PI*2)-Math.PI)*Math.min(1,dt*12);
        var hv=Math.hypot(vel.x,vel.z);if(onGround&&hv>.3){step+=dt*hv*1.6;var sw=Math.sin(step)*Math.min(.9,hv*.12);legL.rotation.x=sw;legR.rotation.x=-sw;armL.rotation.x=-sw*.8;armR.rotation.x=sw*.8;
            if(Math.sin(step)*Math.sin(step-dt*hv*1.6)<0&&hv>5)puff(A.position.x,A.position.z,2);}
          else{var air=!onGround;legL.rotation.x+=((air?.35:0)-legL.rotation.x)*dt*5;legR.rotation.x+=((air?-.2:0)-legR.rotation.x)*dt*5;armL.rotation.x+=((air?-.5:0)-armL.rotation.x)*dt*5;armR.rotation.x+=((air?-.5:0)-armR.rotation.x)*dt*5;}
        armL.rotation.z=onGround?.08:.5;armR.rotation.z=onGround?-.08:-.5;torso.position.y=TY+(onGround?Math.abs(Math.sin(step))*.04:0);
        fires.forEach(function(f){f.visible=false;});shipLight.intensity=0;shipFx(dt,0);
        var ns=nearShip();prompt.hidden=!ns;if(ns)prompt.innerHTML='<kbd>E</kbd> Get in the spaceship';if(nearIndra()&&!PR.on){prompt.hidden=false;prompt.innerHTML='<kbd>E</kbd> Offer dandavat pranam';}if(PR.on)prompt.hidden=true;if(!SWG)actsWalk(dt);
        fuelEl.style.width=(fuel*100).toFixed(0)+'%';altEl.textContent=Math.max(0,A.position.y-gh).toFixed(1)+' m';
        focus=A.position;
      } else {
        /* ---- flying ---- */
        shipYaw+=tn*dt*(run?.9:1.3);
        var target=fw>0?(run?4000:260):fw<0?-40:0;shipV+=(target-shipV)*Math.min(1,dt*(fw>0?(run?.9:1.2):.8));
        var vt=(K[' ']?(run?1500:60):0)-(K.z||K.x?(run?1500:60):0);shipVy+=(vt-shipVy)*Math.min(1,dt*2);
        SH.position.x+=Math.sin(shipYaw)*shipV*dt;SH.position.z+=Math.cos(shipYaw)*shipV*dt;SH.position.y+=shipVy*dt;
        /* the moon: ground or ball */
        if(cur==='Swarg'){var sg0=swH(SH.position.x,SH.position.z)+.05;if(SH.position.y<sg0){SH.position.y=sg0;if(shipVy<0)shipVy=0;}var srd=Math.hypot(SH.position.x,SH.position.z);if(srd>SWR+300){SH.position.x*=(SWR+300)/srd;SH.position.z*=(SWR+300)/srd;}if(SH.position.y>520)leaveSwarg();}else{
        var px2=SH.position.x,pz2=SH.position.z,inPlane=Math.abs(px2)<HALF*.95&&Math.abs(pz2)<HALF*.95;
        if(inPlane){var gh2=height(px2,pz2)+.05;if(SH.position.y<gh2){SH.position.y=gh2;if(shipVy<0)shipVy=0;}}
        else{tmp.copy(SH.position).sub(MOONC);var dm=tmp.length();if(dm<MR+2){SH.position.copy(MOONC).add(tmp.multiplyScalar((MR+2)/dm));}}}
        /* planets: bump off them; the Earth takes you home */
        for(var bi=0;bi<bodies.length;bi++){var B=bodies[bi];tmp.copy(SH.position).sub(B.m.position);var dB=tmp.length();if(B.m.visible&&dB<B.r*1.06+3){if(B.exit){landEarth();break;}if(B.name!=='Sun'&&!busyW){landOn(B);break;}SH.position.copy(B.m.position).add(tmp.multiplyScalar((B.r*1.06+3)/dB));shipV*=.3;if(t-tooHot>4){tooHot=t;showBanner('Too hot to land!','The Sun is 5,500 °C at the surface. Try a planet instead.');}}}
        if(cur==='Moon'&&!curB&&!busyW&&SH.position.distanceTo(PORTALP)<430)enterSwarg();
        if(curB){var LW=HALF*.9;if(Math.abs(SH.position.x)>LW){SH.position.x=-Math.sign(SH.position.x)*HALF*.86;camPos.set(0,0,0);}if(Math.abs(SH.position.z)>LW){SH.position.z=-Math.sign(SH.position.z)*HALF*.86;camPos.set(0,0,0);}if(SH.position.y>420)leaveWorld();}
        shipRoll+=(-tn*(.25+Math.min(.35,Math.abs(shipV)/2000))-shipRoll)*Math.min(1,dt*4);
        SH.rotation.set(-Math.max(-.35,Math.min(.35,shipVy/1200)),shipYaw,shipRoll,'YXZ');
        var pow=Math.min(1,Math.max(fw>0?.35:0,Math.abs(shipV)/600)+(K[' ']?.25:0));fires.forEach(function(f){f.visible=pow>.05;f.scale.set(1,.4+pow*(run?1.8:1)+Math.random()*.15,1);});shipLight.intensity=pow*3;shipFx(dt,pow);
        A.position.copy(SH.position);
        var land=shipLanded();prompt.hidden=!land||Math.abs(shipV)>8;if(!prompt.hidden)prompt.innerHTML='<kbd>E</kbd> Get out and walk';
        fuelEl.style.width='100%';var spd=Math.round(Math.abs(shipV)*3.6);altEl.textContent=(spd>999?(spd/1000).toFixed(1)+'k':spd)+' km/h';
        focus=SH.position;
      }
      /* floating rocks and dust */
      floaters.forEach(function(f){var u=f.userData;f.position.y=u.b+Math.sin(t*u.sp+u.ph)*1.2;f.rotation.x+=u.rs.x*dt;f.rotation.y+=u.rs.y*dt;f.rotation.z+=u.rs.z*dt;});
      dust.position.y=Math.sin(t*.2)*.5;dust.rotation.y=t*.01;
      puffs=puffs.filter(function(o){var u=o.userData;u.t+=dt;o.position.addScaledVector(u.v,dt);u.v.y-=.5*dt;o.scale.setScalar(1+u.t*2);o.material.opacity=.45*(1-u.t/1.6);if(u.t>1.6){S.remove(o);o.material.dispose();return false;}return true;});
      bodies.forEach(function(B){B.m.rotation.y+=B.spin*dt;});
      if(cur==='Swarg')swargAnim(dt);else actsAnim(dt);portal.userData.disc.rotation.z+=dt*.15;mapTick=(mapTick+1)%6;if(!mapTick)drawMap();
      /* camera */
      var baseYaw=(mode==='ship'?shipYaw:A.rotation.y)+Math.PI+yawOff,dd2=mode==='ship'?dist*(1+Math.min(1.2,Math.abs(shipV)/1500)):dist;
      var off=new T.Vector3(Math.sin(baseYaw)*Math.cos(pitch)*dd2,Math.sin(pitch)*dd2+(mode==='ship'?3:1.6),Math.cos(baseYaw)*Math.cos(pitch)*dd2);
      var want=focus.clone().add(off);if(cur==='Swarg'){var ch2=swH(want.x,want.z)+.6;if(want.y<ch2)want.y=ch2;}else if(Math.abs(want.x)<HALF&&Math.abs(want.z)<HALF){var ch=height(want.x,want.z)+.6;if(want.y<ch)want.y=ch;}
      if(cur==='Swarg'||(Math.abs(focus.x)<HALF&&Math.abs(focus.z)<HALF&&focus.y<400)){for(var lk=1;lk<4;lk++){var lf=lk/4,lg=(cur==='Swarg'?swH(want.x+(focus.x-want.x)*lf,want.z+(focus.z-want.z)*lf):height(want.x+(focus.x-want.x)*lf,want.z+(focus.z-want.z)*lf))+.5,need=(lg-(focus.y+1.2)*lf)/(1-lf);if(want.y<need)want.y=need;}}
      if(!camPos.lengthSq()||camPos.distanceTo(want)>3000)camPos.copy(want);camPos.lerp(want,1-Math.pow(mode==='ship'?.0005:.0015,dt));cam.position.copy(camPos);look.copy(focus).y+=mode==='ship'?2:2.2;cam.lookAt(look);
      sky.position.copy(cam.position);
      sun.position.copy(focus).addScaledVector(SUND,150);sun.target.position.copy(focus);
      moonLbl.visible=cur==='Moon'&&cam.position.distanceTo(MOONC)>MR*2.2;moonLbl.position.copy(MOONC).add(new T.Vector3(0,MR*1.3,0));
      if(fw||tn||K[' ']){moved+=dt;if(moved>6)help.classList.add('dim');}
      R.render(S,cam);}
    featFor('Moon');buildActs('Moon');reset();
    if(/[?&]moonwalk=1/.test(location.search))window.__mw={R:R,S:S,cam:cam,tp:function(x,z){A.position.set(x,groundAt(x,z,0),z);vel.set(0,0,0);onGround=true;camPos.set(0,0,0);},swarg:function(){enterSwarg();},land:function(n){landOn(bodies.filter(function(b){return b.name===n;})[0]);},info:function(){return {cur:cur,mode:mode,a:A.position.toArray().map(Math.round),pr:PR.on,goal:goalEl.textContent};},portal:function(){SH.position.copy(PORTALP).add(new T.Vector3(0,0,700));shipYaw=Math.PI;},ship:function(){return SH.position.toArray();},to:function(n){var B=bodies.filter(function(b){return b.name===n;})[0];SH.position.copy(B.m.position).add(new T.Vector3(0,0,B.r*1.6));shipYaw=Math.PI;}};
    return {start:function(){last=performance.now();cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix();R.setSize(innerWidth,innerHeight);raf=requestAnimationFrame(frame);},stop:function(){cancelAnimationFrame(raf);K={};}};
  }
  function show(){box.hidden=false;document.documentElement.style.overflow='hidden';open=true;
    if(G){G.start();return;}document.getElementById('mwLoad').hidden=false;
    loadThree(function(){setTimeout(function(){try{G=build();document.getElementById('mwLoad').hidden=true;if(open)G.start();}catch(e){console.error(e);document.querySelector('#mwLoad p').textContent='Your browser could not start the moon walk.';}},30);});}
  function hide(){open=false;if(G)G.stop();box.hidden=true;document.documentElement.style.overflow='';try{hit.focus({preventScroll:true});}catch(e){}}
  hit.addEventListener('click',show);
  document.getElementById('mxExit').addEventListener('click',hide);
  document.getElementById('mxHome').addEventListener('click',function(e){if(/^\/(index\.html)?$/.test(location.pathname)){e.preventDefault();hide();scrollTo({top:0,behavior:'smooth'});}});
  addEventListener('keydown',function(e){if(open&&e.key==='Escape')hide();});
  if(window.__mwAuto){window.__mwAuto=0;show();}
})();
