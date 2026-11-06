import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeReleases,fetchAllReleases} from '../release-data.mjs';

const asset=(id,count,name='TegnasLauncher.exe')=>({id,name,download_count:count,size:123456,digest:'sha256:'+'a'.repeat(64),browser_download_url:'https://github.com/Tegnas/tegnas-launcher/releases/download/v1/TegnasLauncher.exe'});
const release=(id,assets,more={})=>({id,tag_name:'v'+id,name:'Release '+id,draft:false,published_at:`2026-11-${String(id).padStart(2,'0')}T12:00:00Z`,assets,...more});

test('counts EXE downloads across releases, excluding drafts and unrelated assets',()=>{
 const data=summarizeReleases([release(1,[asset(10,7),asset(11,900,'source.zip')]),release(3,[asset(30,400)],{draft:true}),release(2,[asset(20,5)],{prerelease:true})]);
 assert.equal(data.downloads,12);assert.equal(data.countedAssets,2);assert.equal(data.latest.tag,'v2');assert.equal(data.latest.beta,true);assert.equal(data.latest.asset.sha256,'a'.repeat(64));
});
test('deduplicates asset IDs and recognizes beta tags even when GitHub marks release stable',()=>{
 const data=summarizeReleases([release(1,[asset(10,7)]),release(2,[asset(10,7)],{tag_name:'v1.1.36-beta'})]);
 assert.equal(data.downloads,7);assert.equal(data.latest.beta,true);
});
test('does not silently turn malformed counts into zero',()=>{
 assert.throws(()=>summarizeReleases([release(1,[asset(1,-1)])]));
 assert.throws(()=>summarizeReleases([release(1,[asset(1,NaN)])]));
 assert.throws(()=>summarizeReleases([]));
});
test('reads all pages before summing and does not present partial totals after failure',async()=>{
 let pages=[];
 const hundred=Array.from({length:100},(_,i)=>release(1,[asset(i,1)]));
 const raw=await fetchAllReleases(async(url)=>{pages.push(url);return {ok:true,json:async()=>pages.length===1?hundred:[release(2,[asset(500,9)])]};});
 assert.equal(pages.length,2);assert.match(pages[1],/page=2$/);assert.equal(summarizeReleases(raw).downloads,109);
 let calls=0;
 await assert.rejects(()=>fetchAllReleases(async()=>{calls++;return {ok:calls===1,json:async()=>hundred};}));
});
test('rejects an HTML/error response and ignores unverified download destinations',async()=>{
 await assert.rejects(()=>fetchAllReleases(async()=>({ok:true,json:async()=>({message:'rate limited'})})));
 const bad=asset(1,2);bad.browser_download_url='https://example.com/fake.exe';
 assert.throws(()=>summarizeReleases([release(1,[bad])]));
});
