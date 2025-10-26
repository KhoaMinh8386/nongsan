import { Link } from 'react-router-dom';
import { Leaf, Shield, Truck, HeartHandshake } from 'lucide-react';

function Home() {
  const features = [
    {
      icon: Leaf,
      title: 'Nông sản sạch',
      description: 'Sản phẩm hữu cơ, không hóa chất độc hại',
    },
    {
      icon: Shield,
      title: 'Cam kết chất lượng',
      description: 'Kiểm tra nghiêm ngặt từ trang trại đến tay bạn',
    },
    {
      icon: Truck,
      title: 'Giao hàng nhanh',
      description: 'Giao hàng tận nơi, giữ nguyên độ tươi ngon',
    },
    {
      icon: HeartHandshake,
      title: 'Hỗ trợ nông dân',
      description: 'Kết nối trực tiếp với các trang trại địa phương',
    },
  ];

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary-600 to-primary-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Nông Sản Sạch
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-primary-100">
              Chất lượng từ trang trại - An toàn cho gia đình bạn
            </p>
            <Link
              to="/products"
              className="inline-block bg-white text-primary-600 px-8 py-4 rounded-lg font-bold text-lg hover:bg-primary-50 transition-colors"
            >
              Khám phá sản phẩm
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">Tại sao chọn chúng tôi?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
                  <feature.icon className="w-8 h-8 text-primary-600" />
                </div>
                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Sẵn sàng mua sắm?</h2>
          <p className="text-xl text-gray-600 mb-8">
            Hơn 100+ sản phẩm nông sản sạch đang chờ bạn
          </p>
          <Link
            to="/products"
            className="inline-block btn-primary px-8 py-4 text-lg"
          >
            Xem tất cả sản phẩm
          </Link>
        </div>
      </section>
    </div>
  );
}

export default Home;
