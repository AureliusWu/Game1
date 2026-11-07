/** Original oscillator-only soundtrack: no samples, streaming, or third-party assets. */
export class AudioEngine {
  constructor(){this.enabled=true;this.ctx=null;this.master=null;this.nextNote=0;this.step=0;this.music=false;this.voices=0;this.lastSounds=new Map();}
  async unlock(){
    if(!this.enabled)return;
    try{
      if(!this.ctx){const A=window.AudioContext||window.webkitAudioContext;if(!A)return;this.ctx=new A();this.master=this.ctx.createGain();this.master.gain.value=.36;this.master.connect(this.ctx.destination);}
      if(this.ctx.state==='suspended')await this.ctx.resume();
    }catch{/* Audio is optional; a browser policy must never prevent gameplay. */}
  }
  setEnabled(on){this.enabled=on;if(this.master&&this.ctx)this.master.gain.setTargetAtTime(on?.36:0,this.ctx.currentTime,.12);if(on)this.unlock();}
  tone(freq,dur=.15,type='sine',vol=.2,delay=0,to=0){
    if(!this.enabled||!this.ctx||this.ctx.state!=='running')return;
    if(this.voices>=48)return;this.voices++;
    const at=this.ctx.currentTime+delay,o=this.ctx.createOscillator(),g=this.ctx.createGain();
    o.type=type;o.frequency.setValueAtTime(freq,at);if(to)o.frequency.exponentialRampToValueAtTime(to,at+dur);
    g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(vol,at+.012);g.gain.exponentialRampToValueAtTime(.0001,at+dur);
    o.connect(g);g.connect(this.master);o.start(at);o.stop(at+dur+.03);o.onended=()=>{o.disconnect();g.disconnect();this.voices--;};
  }
  play(type,data={}){
    const interval=({impact:.07,death:.085,collect:.065,shoot:.06})[type];
    if(interval){const now=this.ctx?.currentTime||0;if(now-(this.lastSounds.get(type)??-Infinity)<interval)return;this.lastSounds.set(type,now);}
    if(type==='impact'){this.tone(165,.055,'triangle',.085,0,75);this.tone(1000,.035,'sine',.03,0,350);}
    if(type==='dash-hit'){this.tone(320,.13,'sawtooth',.055,0,85);this.tone(900,.08,'triangle',.07);}
    if(type==='overdrive'){this.tone(80,.4,'triangle',.18,0,42);[392,523,784,1047].forEach((n,i)=>this.tone(n,.45,'triangle',.1,i*.07));}
    if(type==='perfect-clear'){this.tone(1047,.3,'sine',.1);this.tone(1568,.4,'sine',.07,.08);}
    if(type==='collect'){this.tone(880,.22,'sine',.17);this.tone(1320,.18,'sine',.07,.045);}
    if(type==='dash')this.tone(180,.16,'triangle',.15,0,600);
    if(type==='pulse'){this.tone(150,.45,'sine',.3,0,500);this.tone(600,.5,'triangle',.08,.05,1200);}
    if(type==='hurt')this.tone(120,.25,'triangle',.22,0,55);
    if(type==='beacon'||type==='won'||type==='boss-defeated') [261.63,329.63,392,523.25,659.25].forEach((n,i)=>this.tone(n,1.7,'sine',.16,i*.13));
    if(type==='shoot')this.tone(540,.09,'sine',.035,0,880);
    if(type==='death'){const note=220+Math.min(12,data.combo||0)*23;this.tone(note,.12,'triangle',.075,0,note*.65);}
    if(type==='boss')this.tone(65,.9,'triangle',.16,0,55);
    if(type==='boss-warning'){this.tone(220,.25,'triangle',.12);this.tone(330,.35,'triangle',.12,.2);}
    if(type==='shield'||type==='interrupt'){this.tone(740,.2,'sine',.13);this.tone(990,.35,'sine',.08,.06);}
    if(type==='echo'||type==='tailwind')this.tone(660,.35,'sine',.08,0,880);
    if(type==='lost'){this.tone(196,1,'sine',.15);this.tone(146.8,1.4,'sine',.1,.25);}
    if(['level','delivery','gear'].includes(type)){this.tone(659,.5,'sine',.13);this.tone(880,.7,'sine',.1,.1);}
    if(type==='forge'){this.tone(440,.14,'triangle',.13);this.tone(990,.3,'sine',.1,.08);}
    if(type==='purchase'||type==='potion')this.tone(520,.3,'sine',.12,0,780);
    if(type==='thunder'){this.tone(95,.2,'sawtooth',.035,0,40);this.tone(940,.12,'sine',.05);}
    if(type==='frost')this.tone(1200,.3,'sine',.06,0,460);
    if(type==='room-clear') [440,660,880].forEach((n,i)=>this.tone(n,.45,'triangle',.08,i*.09));
    if(type==='evolution'||type==='revive') [262,392,523,784,1047].forEach((n,i)=>this.tone(n,.9,'sine',.11,i*.12));
    if(type==='storm-warning')this.tone(320,.15,'triangle',.08,0,700);
    if(type==='upgrade-pick'){this.tone(660,.16,'sine',.1);this.tone(990,.2,'sine',.08,.055);}
    if(type==='elite-defeated'){this.tone(130,.25,'triangle',.14,0,65);[523,659,784].forEach((n,i)=>this.tone(n,.3,'triangle',.09,i*.07));}
    if(type==='combo-milestone'){[523,784,1047].forEach((n,i)=>this.tone(n,.2,'sine',.09,i*.05));}
    if(type==='boss-enrage'){this.tone(110,.7,'sawtooth',.06,0,65);this.tone(220,.5,'triangle',.1,.1,110);}
    if(type==='ward-break')this.tone(1200,.22,'triangle',.075,0,420);
    if(type==='enemy-attack')this.tone(140,.12,'triangle',.04,0,80);
    if(type==='click')this.tone(520,.07,'sine',.08);
  }
  update(active,chapter=0){
    this.music=active;
    if(!active||!this.enabled||!this.ctx||this.ctx.state!=='running')return;
    const now=this.ctx.currentTime;if(this.nextNote>now+.1)return;this.nextNote=now+1.8;
    const notes=[261.63,293.66,329.63,392,440,523.25,440,392,329.63,293.66,261.63,196];
    const note=notes[(this.step+chapter*3)%notes.length];
    this.tone(note,.95,'sine',.065);this.tone(note/2,1.6,'sine',.045);if(this.step%4===0)this.tone(65.4,3,'sine',.055);this.step++;
  }
  suspend(){if(this.ctx?.state==='running')this.ctx.suspend().catch(()=>{});}
}
