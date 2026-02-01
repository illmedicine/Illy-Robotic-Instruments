import { readFileSync } from "fs";
import path from "path";

export default function Home() {
  const htmlPath = path.join(process.cwd(), "public", "index.html");
  const htmlContent = readFileSync(htmlPath, "utf-8");

  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
      <script
        dangerouslySetInnerHTML={{
          __html: `
            function setHeaderLogoFallback(img) {
              img.style.display = 'none';
            }
            
            const menuBtn = document.getElementById('menuBtn');
            const mobileMenu = document.getElementById('mobileMenu');
            
            if (menuBtn && mobileMenu) {
              menuBtn.addEventListener('click', () => {
                mobileMenu.classList.toggle('hidden');
                menuBtn.setAttribute('aria-expanded', 
                  menuBtn.getAttribute('aria-expanded') === 'true' ? 'false' : 'true'
                );
              });
            }
          `,
        }}
      />
    </>
  );
}
