import Main from "@/components/Main";
import { Rubik } from 'next/font/google';
const rubik = Rubik({
  subsets: ['latin', 'latin-ext'],
});

export default function Home() {
  return (
    <main className={`${rubik.className} w-[100dvw] h-[100dvh] text-white`} >
      <Main />
    </main >
  );
}
