# LinkedIn draft — Jisun Kim

As a Korean international student pursuing an MS in Data Science at the University of Minnesota, I spend a lot of time studying academic subjects in English. Sometimes I understand the individual words but still need to pause to work out what a sentence means in its technical context. I also want the expressions I encounter to become part of my own English vocabulary.

That experience motivated me to build StudyBridge, a provisional name for a bilingual academic reading and vocabulary platform.

The MVP lets readers paste an English excerpt, read sentence-aligned English and Korean, and explore a word or phrase in context. Selecting an expression opens its explanation; saving it is a separate, deliberate action. The vocabulary collection keeps the original sentence, its translation, usage notes, and clearly labeled generated examples for later review.

I built it with Next.js, TypeScript, Tailwind CSS, and Supabase, with server-side OpenAI integration. The implementation includes email/password authentication flows, owner-only database policies, and a shared per-user AI request limit. Automated component and sample browser checks are part of the project. Live authentication, email, hosted database persistence, and AI responses still need to be configured and verified; the sample mode is clearly separated from those integrations.

My goal for this first version is a focused reading workflow that supports understanding now and more deliberate vocabulary learning over time. I have not conducted user testing yet, and I would appreciate feedback from students who study in another language, language learners, and people building educational tools.

What would help you most when reading academic material in a second language?

#DataScience #InternationalStudents #LanguageLearning #Nextjs #PortfolioProject
