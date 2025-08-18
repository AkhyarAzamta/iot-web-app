// app/about/page.tsx
'use client';
import Footer from "@/components/footer";
import NavHome from "@/components/nav-home";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LanguageProvider } from "@/lib/i18n";
import { Linkedin, Twitter, Instagram, Facebook, MapPin, Phone, Mail, ExternalLink } from 'lucide-react';
import Image from "next/image";

export default function AboutUs() {
  const teamMembers = [
    {
      name: "Akhyar Azamta",
      role: "Founder & CEO",
      bio: "Software Engineer dan Spesialis IoT dengan background Teknik Informatika dan Teknik Elektronika. Memimpin visi perusahaan untuk membuat teknologi terjangkau bagi petambak kecil.",
      image: "/members/azam.jpg",
      linkedin: "https://www.linkedin.com/in/akhyarazamta/",
    },
    {
      name: "Mupit",
      role: "Digital Marketing Lead",
      bio: "Mengembangkan dan melaksanakan strategi pemasaran yang efektif serta visibilitas perusahan pada promosi produk dan layanan secara online.",
      image: "",
      linkedin: "https://www.linkedin.com/in/mupit",
    },
    {
      name: "Dappa",
      role: "Head of Product",
      bio: "Mendesain pengalaman pengguna yang intuitif untuk petambak dengan berbagai tingkat literasi digital.",
      image: "",
      linkedin: "https://www.linkedin.com/in/dappa",
    },
    {
      name: "Anggie",
      role: "Field Support Manager",
      bio: "Memimpin tim lapangan yang membantu instalasi perangkat dan pelatihan penggunaan.",
      image: "",
      linkedin: "https://www.linkedin.com/in/anggie",
    },
  ];

  const reviews = [
    {
      name: "Ikbal Ismail",
      pond: "Tambak Lele, Jawa Timur",
      review: "Sangat membantu! Saya bisa mengatur pemberian pakan secara otomatis. Waktu saya jadi lebih efisien.",
      image: "/reviews/konell.jpg",
    },
    {
      name: "Rifki Budiman",
      pond: "Tambak Nila, Sumatera Selatan",
      review: "Teknologi ini sangat membantu petambak kecil seperti saya. Investasi yang sangat berharga.",
      image: "/reviews/ikun.jpg",
    },
    {
      name: "Akbar Fahrizal",
      pond: "Tambak Bandeng, Kalimantan",
      review: "Sistemnya mudah digunakan, bahkan untuk petambak tradisional. Saya bisa fokus pada budidaya tanpa khawatir kualitas air.",
      image: "/reviews/dadoy.jpg",
    },
    {
      name: "Willy Pedriansyah",
      pond: "Tambak Kakap, Bali",
      review: "Setelah menggunakan Smart FishFarm, saya bisa mengurangi limbah pakan hingga 20%. Sangat efisien!",
      image: "/reviews/willy.jpg",
    },
    {
      name: "Cecep Kurniawan",
      pond: "Tambak Gurame, Lampung",
      review: "Layanan pelanggan sangat responsif. Mereka membantu saya mengatasi masalah teknis dengan cepat.",
      image: "/reviews/ccp.jpg",
    },
    {
      name: "Moch Fadli",
      pond: "Tambak Patin, Sulawesi",
      review: "Saya sangat puas dengan produk ini. Monitoring kualitas air jadi lebih mudah dan akurat.",
      image: "/reviews/enang.jpg",
    },
    {
      name: "Irfan Sutisna",
      pond: "Tambak Udang, Jawa Barat",
      review: "Dengan Smart FishFarm, saya bisa memantau kualitas air secara real-time. Hasil panen meningkat 30%!",
      image: "/reviews/mas.jpg",
    },
  ]

  const milestones = [
    { year: "2024", event: "Pendirian perusahaan dan riset awal" },
    { year: "Januari 2025", event: "Prototype pertama diuji di tambak Jawa Barat" },
    { year: "April 2025", event: "Peluncuran produk komersial pertama" },
    { year: "Agustus 2025", event: "Ekspansi ke 15 provinsi di Indonesia" },
    { year: "November 2025", event: "Peluncuran platform mobile app", status: "soon" },
  ];

  return (
    <LanguageProvider>
      <div className=" overflow-hidden bg-slate-50 dark:bg-slate-900">
        <NavHome />
        {/* Hero Section */}
        <section className="pt-32 pb-20 bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-4xl md:text-5xl font-bold mb-6">Mengubah Akuakultur dengan Teknologi</h1>
              <p className="text-xl max-w-3xl mx-auto mb-8">
                Smart FishFarm menghadirkan solusi IoT terjangkau untuk membantu petambak meningkatkan produktivitas
                dan keberlanjutan usaha budidaya perikanan.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button variant="secondary" size="lg">Pelajari Teknologi Kami</Button>
                <Button variant="outline" className="bg-transparent border-white text-white hover:bg-white hover:text-blue-600" size="lg">
                  Bergabung dengan Tim
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Our Story */}
        <section className="py-20 bg-white dark:bg-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">Kisah Kami</h2>
              <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                Bermula dari keprihatinan akan tantangan yang dihadapi petambak tradisional, kami hadir dengan solusi teknologi tepat guna.
              </p>
            </div>

            <div className="flex flex-col md:flex-row gap-10 items-center">
              <div className="md:w-1/2">
                <Image src="/IoT.jpg" alt="About Us" width={500} height={300} className="border-2 border-dashed rounded-xl" />
              </div>
              <div className="md:w-1/2">
                <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">Dari Tambak ke Teknologi</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  Smart FishFarm didirikan oleh Akhyar Azamta, seorang Sofware Engineer & Spesialis Internet of Things(IoT) yang melihat langsung
                  bagaimana petambak kesulitan memantau kualitas air secara real-time. Jumlah panen menurun akibat perubahan parameter
                  air yang tak terdeteksi adalah masalah umum yang menyebabkan kerugian besar.
                </p>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  Bersama tim Developer dan desainer produk, kami mengembangkan sistem pemantauan berbasis IoT yang terjangkau
                  namun akurat. Setelah 1 tahun riset dan pengujian lapangan, produk pertama kami diluncurkan di Jawa Barat dan
                  segera menyebar ke seluruh Indonesia.
                </p>
                <div className="flex items-center">
                  <div className="ml-4">
                    <p className="font-bold text-gray-800 dark:text-white">Akhyar Azamta</p>
                    <p className="text-gray-600 dark:text-gray-300">Founder & CEO Smart FishFarm</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Mission & Vision */}
        <section className="py-20 bg-slate-50 dark:bg-slate-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 gap-10">
              <Card className="bg-gradient-to-br from-cyan-500 to-blue-500 text-white">
                <CardHeader>
                  <CardTitle className="text-2xl text-center">Visi</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-4">
                    Menjadi mitra teknologi terpercaya bagi 50% petambak di Indonesia pada tahun 2030,
                    mendorong transformasi digital di sektor akuakultur untuk menciptakan perikanan berkelanjutan.
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>Membangun ekosistem akuakultur berbasis data di Indonesia</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>Mengurangi limbah budidaya ikan melalui manajemen berbasis presisi</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>Meningkatkan kesejahteraan petambak melalui peningkatan produktivitas</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>Membuka akses pasar yang lebih luas bagi produk perikanan lokal</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-blue-600 to-cyan-600 text-white">
                <CardHeader>
                  <CardTitle className="text-2xl text-center">Misi</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-4">
                    Memberdayakan petambak dengan teknologi pemantauan kualitas air yang terjangkau dan mudah digunakan,
                    untuk meningkatkan produktivitas dan keberlanjutan usaha budidaya perikanan.
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>Mengembangkan solusi IoT yang terjangkau untuk tambak skala kecil dan menengah</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>Menyederhanakan teknologi kompleks menjadi mudah digunakan petambak tradisional</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>Mengurangi risiko kegagalan panen akibat perubahan kualitas air</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>Meningkatkan efisiensi pakan dan pengelolaan tambak</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

            </div>
          </div>
        </section>

        {/* Our Team */}
        <section className="py-20 bg-white dark:bg-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">Meet the Team</h2>
              <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                Tim multidisiplin yang menghubungkan keahlian teknologi, dan desain untuk menciptakan solusi nyata.
              </p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-4">
              {teamMembers.map((member, index) => (
                <Card key={index} className="text-center p-2 lg:p-2">
                  <CardHeader className="lg:px-6 px-0">
                    <div className="mx-auto mb-4">
                      <Image src={member.image ? member.image : `/members/default.jpg`} alt={`${member.name} Profile`} width={320} height={320} className="rounded-full mx-auto" />
                    </div>
                    <CardTitle className="lg:text-xl flex justify-center items-center gap-2">{member.name}<a href={member.linkedin} target="_blank" rel="noopener noreferrer"> <ExternalLink size={20} /></a></CardTitle>
                    <p className="text-blue-600 dark:text-blue-400">{member.role}</p>
                  </CardHeader>
                  <CardContent className="lg:px-6 px-0">
                    <p className="text-gray-600 dark:text-gray-300">{member.bio}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="text-center mt-12">
              <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">Bergabung dengan Tim Kami</h3>
              <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-6">
                Kami selalu mencari talenta berbakat yang bersemangat untuk membuat perbedaan di sektor perikanan Indonesia.
              </p>
              <Button variant="outline" className="border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20">
                Lihat Lowongan Pekerjaan
              </Button>
            </div>
          </div>
        </section>

        {/* Milestones */}
        <section className="py-20 bg-slate-50 dark:bg-slate-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">Perjalanan Kami</h2>
              <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                Dari ide sederhana hingga solusi yang digunakan ratusan petambak di seluruh Indonesia.
              </p>
            </div>

            <div className="relative">
              {/* Garis waktu */}
              <div className="absolute left-1/2 transform -translate-x-1/2 h-full w-1 bg-blue-200 dark:bg-blue-900"></div>

              {/* Titik-titik milestone */}
              <div className="space-y-12">
                {milestones.map((milestone, index) => (
                  <div
                    key={index}
                    className={`relative flex ${index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'} items-center`}
                  >
                    <div className="md:w-5/12 flex justify-center md:justify-end">
                      <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-slate-700">
                        {milestone.status === "soon" ?
                          <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded-full dark:bg-yellow-900 dark:text-yellow-300">
                            Coming Soon
                          </span>
                          : null}
                        <h3 className="text-xl font-bold text-blue-600 dark:text-blue-400 mb-2">{milestone.year}</h3>
                        <p className="text-gray-800 dark:text-white">{milestone.event}</p>
                      </div>
                    </div>

                    <div className="md:w-2/12 flex justify-center">
                      <div className="w-8 h-8 rounded-full bg-blue-600 border-4 border-white dark:border-slate-900 z-10"></div>
                    </div>

                    <div className="md:w-5/12"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="py-20 bg-white dark:bg-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">Nilai-nilai Kami</h2>
              <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                Prinsip yang memandu setiap keputusan dan tindakan kami.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <Card className="text-center">
                <CardHeader>
                  <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <CardTitle>Berfokus pada Petambak</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-300">
                    Petambak adalah pusat dari semua yang kami lakukan. Kami mendengarkan tantangan mereka dan merancang solusi
                    yang benar-benar memecahkan masalah nyata di lapangan.
                  </p>
                </CardContent>
              </Card>

              <Card className="text-center">
                <CardHeader>
                  <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <CardTitle>Inovasi yang Terjangkau</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-300">
                    Kami percaya bahwa teknologi canggih seharusnya bisa diakses oleh semua kalangan.
                    Kami berinovasi untuk menciptakan solusi dengan harga terjangkau tanpa mengorbankan kualitas.
                  </p>
                </CardContent>
              </Card>

              <Card className="text-center">
                <CardHeader>
                  <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </div>
                  <CardTitle>Keberlanjutan</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-300">
                    Semua solusi kami dirancang dengan prinsip keberlanjutan - baik untuk lingkungan maupun usaha petambak.
                    Kami membantu mengurangi limbah dan meningkatkan efisiensi sumber daya.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-20 bg-gradient-to-r from-cyan-500 to-blue-500 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4">Apa Kata Petambak Kami</h2>
              <p className="text-cyan-100 max-w-2xl mx-auto">
                Kisah sukses dari petambak yang telah menggunakan solusi Smart FishFarm
              </p>
            </div>

            <Carousel
              opts={{
                align: "start",
                loop: true,
              }}
              className="w-full">
              <CarouselContent>
                {reviews.map((review, index) => (
                  <CarouselItem
                    key={index}
                    className="md:basis-1/2 lg:basis-1/4 p-4"
                  >
                    <Card className="bg-white/10 backdrop-blur-sm border border-white/20 h-full">
                      <CardHeader>
                        <div className="mx-auto mb-4 w-[200px] h-[200px] relative">
                          <Image
                            src={review.image || '/reviews/default.jpg'}
                            alt={`${review.name} Profile`}
                            fill
                            className="rounded-full object-cover"
                          />
                        </div>
                        <CardTitle className="text-xl flex justify-center items-center gap-2">
                          {review.name}
                        </CardTitle>
                        <p className="text-white flex justify-center items-center dark:text-blue-400">{review.pond}</p>
                      </CardHeader>
                      <CardContent>
                        <p className="dark:text-gray-300">{review.review}</p>
                      </CardContent>
                    </Card>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="opacity-100 bg-white/20 hover:bg-white/40 text-white border-none" />
              <CarouselNext className="opacity-100 bg-white/20 hover:bg-white/40 text-white border-none" />
            </Carousel>
          </div>
        </section>

        {/* Contact Section */}
        <section className="py-20 bg-white dark:bg-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">Hubungi Kami</h2>
              <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                Punya pertanyaan atau ingin bekerja sama? Tim kami siap membantu Anda.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-10">
              <div>
                <form className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nama Lengkap</label>
                      <Input type="text" id="name" placeholder="Nama Anda" />
                    </div>
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email</label>
                      <Input type="email" id="email" placeholder="email@gmail.com" />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Subjek</label>
                    <Input type="text" id="subject" placeholder="Subjek pesan" />
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Pesan</label>
                    <Textarea id="message" placeholder="Tulis pesan Anda di sini" rows={5} />
                  </div>

                  <Button type="submit" className="w-full">Kirim Pesan</Button>
                </form>
              </div>

              <div>
                <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-8 h-full">
                  <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-6">Informasi Kontak</h3>
                  <div className="space-y-6">
                    <div className="flex items-start">
                      <MapPin className="text-blue-600 text-xl mt-1 mr-4" />
                      <div>
                        <h4 className="font-semibold text-gray-800 dark:text-white mb-1">Kantor Pusat</h4>
                        <p className="text-gray-600 dark:text-gray-300">
                          Jl. Laswi Ciparay No. 14, Kab. Bandung<br />
                          Bandung, Jawa Barat 40381, Indonesia
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start">
                      <Phone className="text-blue-600 text-xl mt-1 mr-4" />
                      <div>
                        <h4 className="font-semibold text-gray-800 dark:text-white mb-1">Telepon</h4>
                        <p className="text-gray-600 dark:text-gray-300">(022) 2937-9514</p>
                      </div>
                    </div>

                    <div className="flex items-start">
                      <Mail className="text-blue-600 text-xl mt-1 mr-4" />
                      <div>
                        <h4 className="font-semibold text-gray-800 dark:text-white mb-1">Email</h4>
                        <p className="text-gray-600 dark:text-gray-300">info@smartfishfarm.com</p>
                      </div>
                    </div>

                    <div className="pt-6">
                      <h4 className="font-semibold text-gray-800 dark:text-white mb-4">Ikuti Kami</h4>
                      <div className="flex space-x-4">
                        <a href="#" className="text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400">
                          <Facebook className="text-2xl" />
                        </a>
                        <a href="#" className="text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400">
                          <Twitter className="text-2xl" />
                        </a>
                        <a href="#" className="text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400">
                          <Instagram className="text-2xl" />
                        </a>
                        <a href="#" className="text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400">
                          <Linkedin className="text-2xl" />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <Footer />
      </div>
    </LanguageProvider>
  );
}