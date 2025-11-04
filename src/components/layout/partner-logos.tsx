import Image from 'next/image';

const logos = [
  { src: '/geo/logos/bd.png', alt: 'BD Logo' }, 
  { src: '/geo/logos/cdc.png', alt: 'CDC Logo' },
  { src: '/geo/logos/gm.png', alt: 'GM Logo' },
  { src: '/geo/logos/brac.png', alt: 'BRAC Logo' },
  { src: '/geo/logos/imacs.jpeg', alt: 'IMACS Logo' },
  { src: '/geo/logos/unops.png', alt: 'UNOPS Logo' },
  { src: '/geo/logos/moru.png', alt: 'MORU Logo' },
  { src: '/geo/logos/mis.png', alt: 'MIS Logo' },
  { src: '/geo/logos/iedcr.png', alt: 'IEDCR Logo' },
];

export default function PartnerLogos() {
  return (
    <div className="flex items-center gap-4">
      {logos.map((logo, index) => (
        <div key={index} className="relative h-8 w-16">
          <Image
            src={logo.src}
            alt={logo.alt}
            fill
            className="object-contain"
          />
        </div>
      ))}
    </div>
  );
}
