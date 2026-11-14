import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { readFile } from 'node:fs/promises'
const stamp = '2026-11-15T00:00:00'
const token = `e30.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now()/1000)+3600 })).toString('base64url')}.sig`
const papers = [1,2,3].map(id => ({id,user_id:1,title:`Fixture paper ${id}`,authors:'Fixture author',status:'completed',created_at:stamp}))
const ref = {source_id:'doc1_chunk11',document_id:1,chunk_id:11,page_number:1,quote:'Accuracy improved by 5 percentage points.',title:'Fixture paper 1'}
test('compare, inspect evidence, review, edit, save, reload and export', async ({page}, info) => {
  const runs: Record<string, unknown>[] = []
  let edit: unknown = null
  let failNext = false
  await page.addInitScript(token => localStorage.setItem('researchmate.token', token), token)
  await page.route('**/api/v1/**', async route => {
    const req = route.request(), path = new URL(req.url()).pathname.replace('/api/v1','')
    const json = (body:unknown,status=200) => route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)})
    if(path==='/auth/me') return json({id:1,email:'fixture@example.com',full_name:'Fixture researcher',is_active:true,created_at:stamp})
    if(path==='/documents') return json({documents:papers,total:3})
    if(path==='/collections' || path==='/tags' || path==='/chat/sessions') return json([])
    if(path==='/analysis/runs' && req.method()==='POST') {
      const data=req.postDataJSON(), id=runs.length+1
      const result=data.kind==='comparison' ? {document_ids:[1,2],document_titles:{1:papers[0].title,2:papers[1].title},coverage:{1:{findings:true},2:{findings:false}},warnings:['Document 2: insufficient evidence'],rows:[{field:'findings',label:'Key Findings',cells:{1:{value:ref.quote,evidence:[ref]},2:{value:'Not reported',evidence:[]}}}]} : {title:'Review draft',abstract:'Selected papers only.',themes:['Effects'],sections:[{heading:'Findings',content:`Known evidence [${ref.source_id}]`,citations:[ref.source_id]}],bibliography:{[ref.source_id]:ref},coverage:{1:'included',2:'insufficient'}}
      const run={...data,id,user_id:1,status:failNext?'failed':'completed',error_message:failNext?'Provider unavailable':null,progress_percent:100,result:failNext?null:result,created_at:stamp}
      failNext=false; runs.push(run); return json(run,201)
    }
    if(path==='/analysis/runs') return json(runs)
    const match=path.match(/^\/analysis\/runs\/(\d+)(.*)$/)
    if(match) {
      if(match[2]==='/edits/latest') return json(edit)
      if(match[2]==='/edits') { edit={id:1,analysis_run_id:Number(match[1]),user_id:1,version:1,edited_content:req.postDataJSON().edited_content,created_at:stamp};return json(edit,201) }
      return json(runs[Number(match[1])-1])
    }
    if(path.endsWith('/evidence-detail')) return json({document_id:1,document_title:'Fixture paper 1',chunk_id:11,page_number:1,source_quote:ref.quote,rects:[],highlight_status:'unavailable'})
    if(path.endsWith('/pdf')) return route.fulfill({contentType:'application/pdf',body:Buffer.from('%PDF-1.4\n%%EOF')})
    return json({detail:path},404)
  })
  page.on('dialog', dialog => dialog.accept())
  await page.goto('/analysis')
  await page.getByRole('button',{name:/Start comparison/}).click()
  await page.getByRole('button',{name:/Fixture paper 1/}).click()
  await page.getByRole('button',{name:/Fixture paper 2/}).click()
  await page.getByRole('button',{name:'Start Comparison',exact:true}).click()
  await expect(page).toHaveURL(/runId=1/)
  await expect(page.getByText(ref.quote,{exact:true}).filter({visible:true}).first()).toBeVisible()
  await page.getByRole('button',{name:/Show evidence|Show 1 source/}).filter({visible:true}).first().click()
  await page.getByRole('button',{name:/View in document|^View$/}).filter({visible:true}).first().click()
  await expect(page.getByRole('dialog',{name:'Source verification'})).toBeVisible()
  await page.getByRole('button',{name:'Return to chat'}).click()
  await page.screenshot({path:info.outputPath('comparison.png'),fullPage:true})
  expect((await new AxeBuilder({page}).include('.comparison-workspace').analyze()).violations).toEqual([])
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({width,height:900})
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    if (width >= 768) { await expect(page.locator('.comparison-matrix.mobile')).toBeHidden(); await expect(page.locator('.comparison-matrix.desktop')).toBeVisible() }
    else { await expect(page.locator('.comparison-matrix.desktop')).toBeHidden(); await expect(page.locator('.comparison-matrix.mobile')).toBeVisible() }
    await page.screenshot({path:info.outputPath(`comparison-${width}.png`),fullPage:true})
  }
  const csvDownload=page.waitForEvent('download')
  await page.getByRole('button',{name:'Export CSV'}).click()
  expect(await readFile((await (await csvDownload).path())!, 'utf8')).toContain(ref.quote)
  await page.getByRole('button',{name:'Back',exact:true}).click()
  await page.getByRole('button',{name:/Generate review/}).click()
  await page.getByRole('button',{name:/Fixture paper 1/}).click()
  await page.getByRole('button',{name:/Fixture paper 2/}).click()
  await page.getByRole('button',{name:'Generate Review',exact:true}).click()
  await expect(page).toHaveURL(/runId=2/)
  await page.getByRole('button',{name:'Edit',exact:true}).click()
  await page.getByRole('textbox',{name:'Review draft'}).fill(`Edited claim [${ref.source_id}]\n\n<img src=x onerror=alert(1)>`)
  await page.getByRole('button',{name:'Save',exact:true}).click()
  await page.reload()
  await expect(page.getByText(/Edited claim/)).toBeVisible()
  await expect(page.locator('.review-content img')).toHaveCount(0)
  const download=page.waitForEvent('download')
  await page.getByRole('button',{name:'Export Markdown',exact:true}).click()
  const text=await readFile((await (await download).path())!,'utf8')
  expect(text).toContain('Edited claim'); expect(text).toContain('Document coverage'); expect(text).toContain(ref.source_id)
  await page.screenshot({path:info.outputPath('review.png'),fullPage:true})
  expect((await new AxeBuilder({page}).include('.review-workspace').analyze()).violations).toEqual([])
  await page.getByRole('button',{name:'Edit',exact:true}).click()
  await expect(page.getByRole('textbox',{name:'Review draft'})).toHaveValue(/Edited claim/)
  await page.getByRole('textbox',{name:'Review draft'}).fill('Unsaved text')
  page.removeAllListeners('dialog'); page.on('dialog', dialog=>dialog.dismiss())
  await page.getByRole('button',{name:'Back',exact:true}).click()
  await expect(page.getByRole('textbox',{name:'Review draft'})).toHaveValue('Unsaved text')
  await page.evaluate(() => window.history.back())
  await expect(page.getByRole('textbox',{name:'Review draft'})).toHaveValue('Unsaved text')
  page.removeAllListeners('dialog'); page.on('dialog', dialog=>dialog.accept())
  await page.getByRole('button',{name:'Back',exact:true}).click()
  // History links resolve their mode from the URL.
  await page.getByRole('button',{name:'Open comparison analysis'}).click()
  await expect(page.getByRole('heading',{name:'Comparison Matrix',exact:true})).toBeVisible()
  await page.getByRole('button',{name:'Back',exact:true}).click()
  failNext=true
  await page.getByRole('button',{name:/Start comparison/}).click()
  await page.getByRole('button',{name:/Fixture paper 1/}).click()
  await page.getByRole('button',{name:/Fixture paper 2/}).click()
  await page.getByRole('button',{name:'Start Comparison',exact:true}).click()
  await expect(page.getByText('Provider unavailable')).toBeVisible()
  await page.getByRole('button',{name:/Try again|Retry/i}).click()
  await page.getByRole('button',{name:'Start Comparison',exact:true}).click()
  await expect(page.getByText(ref.quote,{exact:true}).filter({visible:true}).first()).toBeVisible()
})
