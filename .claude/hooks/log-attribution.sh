#!/bin/bash
node -e "
  const fs=require('fs'),path=require('path'),{execSync}=require('child_process');
  let c=[];
  process.stdin.on('data',d=>c.push(d));
  process.stdin.on('end',()=>{
    const d=JSON.parse(Buffer.concat(c).toString());
    if(!d.tool_input||!d.tool_input.file_path)process.exit(0);
    const l=JSON.stringify({session_id:d.session_id,file_path:d.tool_input.file_path,tool_name:d.tool_name,timestamp:Date.now()});
    fs.appendFileSync(path.join(d.cwd,'.claude','file-attribution.jsonl'),l+'\\n');
    try{
      const pf=path.join(d.cwd,'.claude','session-pids.json');
      let m={};try{m=JSON.parse(fs.readFileSync(pf));}catch{}
      if(!m[d.session_id]){
        let pids=[],pid=process.ppid;
        for(let i=0;i<5&&pid>1;i++){
          try{pid=parseInt(execSync('ps -o ppid= -p '+pid).toString().trim());
          if(pid>1)pids.push(pid);}catch{break;}
        }
        if(pids.length){m[d.session_id]=pids;fs.writeFileSync(pf,JSON.stringify(m));}
      }
    }catch{}
  });
"
