// "use client";

// import { useEffect, useState } from "react";
// import { motion, AnimatePresence } from "framer-motion";
// import { Container } from "./Container";

// const sets = [
//   ["MACD", "RSI", "Bollinger", "Dual Thrust", "Bybit", "pandas", "FastAPI", "Next.js", "WebSockets", "Python"],
// ];

// export function TrustedBy() {
//   const [i, setI] = useState(0);
//   useEffect(() => {
//     const id = setInterval(() => setI((p) => (p + 1) % sets.length), 5000);
//     return () => clearInterval(id);
//   }, []);

//   return (
//     <Container className="py-28">
//       <h2 className="text-center text-3xl font-bold leading-snug tracking-tight text-white sm:text-[40px]">
//         The honest cockpit for
//         <br />
//         traders who check their work
//       </h2>

//       {/* <div className="relative mt-16 min-h-[160px]">
//         <AnimatePresence mode="wait">
//           <motion.div
//             key={i}
//             initial={{ opacity: 0 }}
//             animate={{ opacity: 1 }}
//             exit={{ opacity: 0 }}
//             transition={{ duration: 0.6 }}
//             className="grid grid-cols-2 gap-x-6 gap-y-12 sm:grid-cols-5"
//           >
//             {sets[i].map((logo) => (
//               <div key={logo} className="flex items-center justify-center">
//                 <span className="text-lg font-semibold text-white/35 transition-colors hover:text-white/60">{logo}</span>
//               </div>
//             ))}
//           </motion.div>
//         </AnimatePresence>
//       </div> */}
//     </Container>
//   );
// }
