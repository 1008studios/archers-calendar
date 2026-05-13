import React from "react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Archers Calendar - The Ultimate Calendar & Schedule Generator for PH Students",
  description: "Learn about Archers Calendar, the free, 30-second calendar and schedule generator created by Richard Christian Uaje for all university students in the Philippines.",
  robots: "index, follow",
};

export default function InfoPage() {
  return (
    <div className="min-h-screen bg-[#0B100D] text-white p-8 font-sans max-w-3xl mx-auto leading-relaxed">
      <h1 className="text-5xl font-black mb-8 text-dlsu-vivid tracking-tighter">Archers Calendar</h1>
      
      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-4 text-white/90">The #1 Calendar & Schedule Generator</h2>
        <p className="text-white/70 text-lg">
          Archers Calendar is a **dedicated calendar and schedule generator** designed specifically for students in the Philippines. 
          Forget manual typing—our smart **copy-paste system** automatically detects your classes and converts 
          messy schedule text into professional, aesthetic wallpapers in under 30 seconds.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-4 text-white/90">Universal & Fully Custom</h2>
        <p className="text-white/70">
          While inspired by DLSU, Archers Calendar is **built for all universities** (UP, UST, ADMU, FEU, and more). 
          It's a fully custom design engine that lets you:
        </p>
        <ul className="mt-4 space-y-3 text-white/60 list-disc pl-5">
          <li>Create high-resolution wallpapers for **iPhone, iPad, MacBook, and Laptops**.</li>
          <li>Export in multiple modes: **Full Wallpaper**, **Clear PNG** (schedule only), or **Backdrop Only**.</li>
          <li>Design with **Emoji Patterns**, **Vivid Gradients**, and **Geometric Textures**.</li>
          <li>**Share your designs** with friends using unique PIN codes or links.</li>
          <li>Adjust every detail from fonts to grid positions using intuitive touch or mouse controls.</li>
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-4 text-white/90">100% Free & Unlocked</h2>
        <p className="text-white/70">
          We believe student tools should be accessible. Archers Calendar is **completely FREE**. 
          There are no premium tiers, no hidden fees, and **all features are fully unlocked** for every student in the PH.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-4 text-white/90">The Creator</h2>
        <p className="text-white/70">
          This project is a labor of love by **Richard Christian Uaje**. It was built to solve the struggle of 
          keeping track of class schedules in a way that looks great on all your devices.
        </p>
      </section>

      <section className="mb-10 text-amber-100/80 bg-amber-900/20 p-6 rounded-2xl border border-amber-700/30">
        <h2 className="text-xl font-bold mb-2">Notice a Bug?</h2>
        <p className="text-sm leading-relaxed">
          The app is built to be robust, but if you find any glitches or if your university's schedule format 
          isn't being detected properly, please report it! Your feedback helps me improve the engine for everyone.
        </p>
        <p className="mt-4 font-black text-amber-200">Report Bugs @richarduaje on Instagram</p>
      </section>

      <footer className="mt-16 pt-8 border-t border-white/10 text-white/30 text-sm flex justify-between items-center">
        <p>&copy; 2026 Archers Calendar. Created by Richard Christian Uaje.</p>
        <p>Made in the PH 🇵🇭</p>
      </footer>
    </div>
  );
}
