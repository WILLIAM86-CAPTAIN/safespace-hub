const path = require('path');
const fs = require('fs');

(async () => {
  const puppeteer = await import('puppeteer');
  const htmlPath = path.resolve(__dirname, 'Safe_Space_Hub_Final_Year_Project_Report.html');
  const outputPdf = path.resolve('C:\\Users\\SAGE WILLIAMZ\\Desktop\\Safe_Space_Hub_Final_Year_Project_Report.pdf');
  const htmlContent = fs.readFileSync(htmlPath, 'utf8');

  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
  await page.pdf({ path: outputPdf, format: 'A4', printBackground: true, margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' } });
  await browser.close();
  console.log('PDF generated:', outputPdf);
})();