import { SessionProvider, useSession } from "./state/session";
import { TopBar } from "./components/TopBar";
import { Consult } from "./screens/Consult";
import { Products } from "./screens/Products";
import { Radar } from "./screens/Radar";
import { PlanB } from "./screens/PlanB";
import { Summary } from "./screens/Summary";

function Journey() {
  const { state } = useSession();
  return (
    <div className="min-h-dvh bg-cream text-ink">
      <TopBar />
      <main key={state.stage} className="anim-rise">
        {state.stage === "consult" && <Consult />}
        {state.stage === "products" && <Products />}
        {state.stage === "radar" && <Radar />}
        {state.stage === "summary" && <Summary />}
      </main>
      {/* Plan B is a global overlay so it can interrupt any radar moment */}
      <PlanB />
      <footer className="border-t border-line/70 px-4 py-6 text-center">
        <p className="mx-auto max-w-md text-[10px] font-medium leading-relaxed text-faint">
          ترب‌گرد — کانسپت تعاملی هکاتون ترب · این نمونه محصول رسمی ترب نیست.
          همه‌ی قیمت‌ها، فروشگاه‌ها و رویدادها «سناریوی نمایشی» هستند؛ شبیه‌سازیِ «جواب ندادن / تأیید نشدن» همیشه با برچسب مشخص است و پاسخ واقعی هیچ فروشنده‌ای جعل نشده است.
        </p>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <SessionProvider>
      <Journey />
    </SessionProvider>
  );
}
