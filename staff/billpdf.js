/* Makes the bill as a real A4 PDF file in the browser (same look as the printed bill).
   NikadiBillPdf.make(d, { base }) -> Promise<{ blob, name, base64() }>
   base = folder that holds vendor/ and the logo path, e.g. '' in /staff/ or '../staff/' in /bill/. */
(function (root) {
  var loading = {};
  function load(src) {
    if (loading[src]) return loading[src];
    loading[src] = new Promise(function (ok, bad) {
      var s = document.createElement('script'); s.src = src; s.onload = ok;
      s.onerror = function () { delete loading[src]; bad(new Error('pdf_tools_failed')); };
      document.head.appendChild(s);
    });
    return loading[src];
  }
  function fileName(d) { return 'Nikadi-Bill-' + String(d.no || 'bill').replace(/[^A-Za-z0-9-]+/g, '-') + '.pdf'; }

  function make(d, opt) {
    opt = opt || {};
    var base = opt.base || '', W = 718; // 190 mm at 96 dpi (A4 minus margins)
    return Promise.all([load(base + 'vendor/html2canvas.min.js'), load(base + 'vendor/jspdf.umd.min.js')]).then(function () {
      return new Promise(function (ok, bad) {
        var f = document.createElement('iframe');
        f.setAttribute('aria-hidden', 'true');
        f.style.cssText = 'position:fixed;left:-10000px;top:0;width:' + W + 'px;height:1200px;border:0;visibility:hidden';
        document.body.appendChild(f);
        var doc = f.contentDocument;
        doc.open(); doc.write(NikadiBill.billHTML(d, { pdf: true, logo: opt.logo || (base + '../img/brand/logo.png') })); doc.close();
        function go() {
          var sheet = doc.querySelector('.sheet');
          var imgs = Array.prototype.slice.call(doc.images);
          Promise.all(imgs.map(function (im) { return im.complete ? 0 : new Promise(function (r) { im.onload = im.onerror = r; }); })).then(function () {
            return root.html2canvas(sheet, { scale: 2.6, backgroundColor: '#ffffff', useCORS: true, logging: false, windowWidth: W });
          }).then(function (canvas) {
            var J = root.jspdf.jsPDF, pdf = new J({ unit: 'mm', format: 'a4', compress: true });
            pdf.setProperties({ title: 'Tax Invoice ' + d.no, subject: 'Nikadi Guest House bill', author: 'Nikadi Guest House', creator: 'Nikadi Staff' });
            var mx = 10, my = 9, pw = 210 - mx * 2, ph = 297 - my * 2;
            var pxPerMm = canvas.width / pw, pageH = Math.floor(ph * pxPerMm), y = 0, first = true;
            while (y < canvas.height) {
              var h = Math.min(pageH, canvas.height - y), part = document.createElement('canvas');
              part.width = canvas.width; part.height = h;
              var cx = part.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, part.width, h);
              cx.drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h);
              if (!first) pdf.addPage();
              pdf.addImage(part.toDataURL('image/jpeg', 0.9), 'JPEG', mx, my, pw, h / pxPerMm, undefined, 'FAST');
              first = false; y += h;
            }
            var blob = pdf.output('blob');
            document.body.removeChild(f);
            ok({ blob: blob, name: fileName(d), base64: function () { return pdf.output('datauristring').split(',')[1]; } });
          }).catch(function (e) { if (f.parentNode) document.body.removeChild(f); bad(e); });
        }
        if (doc.readyState === 'complete') setTimeout(go, 50); else f.onload = function () { setTimeout(go, 50); };
      });
    });
  }
  function download(res) {
    var a = document.createElement('a'), u = URL.createObjectURL(res.blob);
    a.href = u; a.download = res.name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(u); a.remove(); }, 4000);
  }
  /* Opens the phone's share sheet with the PDF (pick WhatsApp). Returns false if this device can't share files. */
  function share(res, text) {
    try {
      var file = new File([res.blob], res.name, { type: 'application/pdf' });
      if (!navigator.canShare || !navigator.canShare({ files: [file] })) return Promise.resolve(false);
      return navigator.share({ files: [file], text: text }).then(function () { return true; }, function (e) { if (e && e.name === 'AbortError') return 'cancel'; return false; });
    } catch (e) { return Promise.resolve(false); }
  }
  root.NikadiBillPdf = { make: make, download: download, share: share, fileName: fileName };
})(window);
