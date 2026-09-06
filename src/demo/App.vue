<template>
  <main class="min-h-screen bg-slate-950 px-5 py-12 text-slate-900 sm:px-8">
    <div class="mx-auto max-w-5xl">
      <header class="mb-8 text-white">
        <p class="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-indigo-300">Audio Editor demo</p>
        <h1 class="text-4xl font-bold tracking-tight sm:text-5xl">Make clean edits in the browser.</h1>
        <p class="mt-4 max-w-2xl text-base leading-7 text-slate-300">Upload an MP3 or M4A, select the part you want to keep or remove, then use undo and redo to refine the edit.</p>
      </header>

      <section class="rounded-2xl bg-white p-5 shadow-2xl shadow-black/30 sm:p-8">
        <AudioEditor />
      </section>

      <p class="mt-5 text-center text-sm text-slate-400">Audio stays in your browser while you edit.</p>
    </div>
  </main>
</template>

<script setup lang="ts">
import { AudioEditor } from '../index'
</script>
