
import React from "react";

const PartnerLogos = () => {
  const partners = [
    {
      name: "Orange Foundation",
      src: "/lovable-uploads/50c2d03a-eeaf-4f6b-b5e5-c6df387657ed.png",
      alt: "Orange Foundation logo"
    },
    {
      name: "Imbuto Foundation",
      src: "/lovable-uploads/52d8a3a8-4039-4e73-9cb7-54162b88d286.png",
      alt: "Imbuto Foundation logo"
    },
    {
      name: "Fishbowl",
      src: "/lovable-uploads/fcaf4018-a970-470a-ae8c-e22c70d841b7.png",
      alt: "Fishbowl logo"
    }
  ];

  return (
    <section className="py-12 md:py-16 bg-white">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-8 font-jakarta text-gray-900">
          Our Trusted Partners
        </h2>
        
        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12 lg:gap-16">
          {partners.map((partner) => (
            <div 
              key={partner.name} 
              className="w-full sm:w-1/2 md:w-1/3 lg:w-1/4 flex justify-center"
            >
              <img
                src={partner.src}
                alt={partner.alt}
                className="h-16 md:h-20 object-contain"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PartnerLogos;
