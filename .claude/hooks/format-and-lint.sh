#!/bin/bash
node -e "
  const fs=require('fs'),path=require('path'),{execFileSync}=require('child_process');
  let c=[];
  process.stdin.on('data',d=>c.push(d));
  process.stdin.on('end',()=>{
    const d=JSON.parse(Buffer.concat(c).toString());
    const filePath=d.tool_input&&d.tool_input.file_path;
    if(!filePath)process.exit(0);
    if(!fs.existsSync(filePath))process.exit(0);

    const formattable=['.ts','.tsx','.js','.jsx','.mjs','.cjs','.json','.css','.md','.mdx','.yml','.yaml','.html'];
    const lintable=['.ts','.tsx','.js','.jsx','.mjs','.cjs'];
    const ext=path.extname(filePath).toLowerCase();
    if(!formattable.includes(ext))process.exit(0);

    const cwd=d.cwd;
    const prettierBin=path.join(cwd,'node_modules','prettier','bin','prettier.cjs');
    const eslintBin=path.join(cwd,'node_modules','eslint','bin','eslint.js');
    if(!fs.existsSync(prettierBin))process.exit(0);

    try{
      execFileSync(process.execPath,[prettierBin,'--write',filePath],{cwd,stdio:'inherit'});
    }catch(e){
      process.exit(0);
    }

    if(!lintable.includes(ext)||!fs.existsSync(eslintBin))process.exit(0);

    try{
      execFileSync(process.execPath,[eslintBin,'--fix',filePath],{cwd,stdio:'inherit'});
    }catch(e){}

    try{
      execFileSync(process.execPath,[eslintBin,filePath],{cwd,stdio:'pipe'});
    }catch(e){
      const output=(e.stdout?e.stdout.toString():'')+(e.stderr?e.stderr.toString():'');
      process.stderr.write(output);
      process.exit(2);
    }
  });
"
