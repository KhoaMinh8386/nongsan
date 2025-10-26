import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { userService } from '../../services/userService';
import { User, Phone, MapPin, Plus, Edit, Trash2, X, Check } from 'lucide-react';

function Profile() {
  const { user } = useSelector((state) => state.auth);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [phones, setPhones] = useState([]);
  const [addresses, setAddresses] = useState([]);
  
  // Modals
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingPhone, setEditingPhone] = useState(null);
  const [editingAddress, setEditingAddress] = useState(null);
  
  // Form data
  const [phoneForm, setPhoneForm] = useState({ phone: '', label: '', is_default: false });
  const [addressForm, setAddressForm] = useState({
    label: '',
    recipient: '',
    phone: '',
    line1: '',
    line2: '',
    ward: '',
    district: '',
    city: '',
    is_default: false
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [profileData, phonesData, addressesData] = await Promise.all([
        userService.getProfile(),
        userService.getPhones(),
        userService.getAddresses()
      ]);
      
      setProfile(profileData.data);
      setPhones(phonesData.data || []);
      setAddresses(addressesData.data || []);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  // Phone handlers
  const openPhoneModal = (phone = null) => {
    if (phone) {
      setEditingPhone(phone);
      setPhoneForm({ phone: phone.phone, label: phone.label || '', is_default: phone.is_default });
    } else {
      setEditingPhone(null);
      setPhoneForm({ phone: '', label: '', is_default: false });
    }
    setShowPhoneModal(true);
  };

  const handlePhoneSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingPhone) {
        await userService.updatePhone(editingPhone.id, phoneForm);
      } else {
        await userService.addPhone(phoneForm);
      }
      setShowPhoneModal(false);
      fetchData();
    } catch (error) {
      alert('Không thể lưu số điện thoại');
    }
  };

  const handlePhoneDelete = async (phoneId) => {
    if (!confirm('Xác nhận xóa số điện thoại này?')) return;
    try {
      await userService.deletePhone(phoneId);
      fetchData();
    } catch (error) {
      alert('Không thể xóa số điện thoại');
    }
  };

  // Address handlers
  const openAddressModal = (address = null) => {
    if (address) {
      setEditingAddress(address);
      setAddressForm({
        label: address.label || '',
        recipient: address.recipient,
        phone: address.phone,
        line1: address.line1,
        line2: address.line2 || '',
        ward: address.ward,
        district: address.district,
        city: address.city,
        is_default: address.is_default
      });
    } else {
      setEditingAddress(null);
      setAddressForm({
        label: '',
        recipient: user?.full_name || '',
        phone: '',
        line1: '',
        line2: '',
        ward: '',
        district: '',
        city: '',
        is_default: false
      });
    }
    setShowAddressModal(true);
  };

  const handleAddressSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingAddress) {
        await userService.updateAddress(editingAddress.id, addressForm);
      } else {
        await userService.addAddress(addressForm);
      }
      setShowAddressModal(false);
      fetchData();
    } catch (error) {
      alert('Không thể lưu địa chỉ');
    }
  };

  const handleAddressDelete = async (addressId) => {
    if (!confirm('Xác nhận xóa địa chỉ này?')) return;
    try {
      await userService.deleteAddress(addressId);
      fetchData();
    } catch (error) {
      alert('Không thể xóa địa chỉ');
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">Tài khoản của tôi</h1>

      {/* Profile Info */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center mb-4">
          <User className="h-6 w-6 text-primary-600 mr-2" />
          <h2 className="text-xl font-bold">Thông tin cá nhân</h2>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-600">Họ tên</label>
            <p className="font-semibold">{profile?.full_name}</p>
          </div>
          <div>
            <label className="text-sm text-gray-600">Email</label>
            <p className="font-semibold">{profile?.email}</p>
          </div>
        </div>
      </div>

      {/* Phones Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Phone className="h-6 w-6 text-primary-600 mr-2" />
            <h2 className="text-xl font-bold">Số điện thoại</h2>
          </div>
          <button onClick={() => openPhoneModal()} className="btn-primary flex items-center">
            <Plus className="h-5 w-5 mr-2" />
            Thêm số điện thoại
          </button>
        </div>

        {phones.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Chưa có số điện thoại nào</p>
        ) : (
          <div className="space-y-3">
            {phones.map((phone) => (
              <div key={phone.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center">
                  <Phone className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="font-semibold">{phone.phone}</p>
                    <p className="text-sm text-gray-600">{phone.label || 'Không có nhãn'}</p>
                  </div>
                  {phone.is_default && (
                    <span className="ml-3 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                      Mặc định
                    </span>
                  )}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => openPhoneModal(phone)}
                    className="text-primary-600 hover:text-primary-800"
                  >
                    <Edit className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handlePhoneDelete(phone.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Addresses Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <MapPin className="h-6 w-6 text-primary-600 mr-2" />
            <h2 className="text-xl font-bold">Địa chỉ giao hàng</h2>
          </div>
          <button onClick={() => openAddressModal()} className="btn-primary flex items-center">
            <Plus className="h-5 w-5 mr-2" />
            Thêm địa chỉ
          </button>
        </div>

        {addresses.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Chưa có địa chỉ nào</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {addresses.map((address) => (
              <div key={address.id} className="p-4 border rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold">{address.recipient}</p>
                    <p className="text-sm text-gray-600">{address.phone}</p>
                  </div>
                  {address.is_default && (
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                      Mặc định
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-700 mb-3">
                  {[address.line1, address.line2, address.ward, address.district, address.city]
                    .filter(Boolean)
                    .join(', ')}
                </p>
                <div className="flex space-x-2">
                  <button
                    onClick={() => openAddressModal(address)}
                    className="text-primary-600 hover:text-primary-800 text-sm flex items-center"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Sửa
                  </button>
                  <button
                    onClick={() => handleAddressDelete(address.id)}
                    className="text-red-600 hover:text-red-800 text-sm flex items-center"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Xóa
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Phone Modal */}
      {showPhoneModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">
                {editingPhone ? 'Sửa số điện thoại' : 'Thêm số điện thoại'}
              </h3>
              <button onClick={() => setShowPhoneModal(false)}>
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handlePhoneSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Số điện thoại *</label>
                <input
                  type="tel"
                  value={phoneForm.phone}
                  onChange={(e) => setPhoneForm({ ...phoneForm, phone: e.target.value })}
                  required
                  placeholder="0909123456"
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Nhãn</label>
                <input
                  type="text"
                  value={phoneForm.label}
                  onChange={(e) => setPhoneForm({ ...phoneForm, label: e.target.value })}
                  placeholder="Nhà, Công ty, v.v."
                  className="input-field"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="phone_default"
                  checked={phoneForm.is_default}
                  onChange={(e) => setPhoneForm({ ...phoneForm, is_default: e.target.checked })}
                  className="h-4 w-4 text-primary-600 rounded"
                />
                <label htmlFor="phone_default" className="ml-2 text-sm">
                  Đặt làm mặc định
                </label>
              </div>

              <div className="flex space-x-3 pt-4">
                <button type="button" onClick={() => setShowPhoneModal(false)} className="btn-outline flex-1">
                  Hủy
                </button>
                <button type="submit" className="btn-primary flex-1">
                  {editingPhone ? 'Cập nhật' : 'Thêm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Address Modal */}
      {showAddressModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">
                {editingAddress ? 'Sửa địa chỉ' : 'Thêm địa chỉ mới'}
              </h3>
              <button onClick={() => setShowAddressModal(false)}>
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleAddressSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Người nhận *</label>
                  <input
                    type="text"
                    value={addressForm.recipient}
                    onChange={(e) => setAddressForm({ ...addressForm, recipient: e.target.value })}
                    required
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Số điện thoại *</label>
                  <input
                    type="tel"
                    value={addressForm.phone}
                    onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                    required
                    className="input-field"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Nhãn</label>
                <input
                  type="text"
                  value={addressForm.label}
                  onChange={(e) => setAddressForm({ ...addressForm, label: e.target.value })}
                  placeholder="Nhà riêng, Văn phòng, v.v."
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Địa chỉ *</label>
                <input
                  type="text"
                  value={addressForm.line1}
                  onChange={(e) => setAddressForm({ ...addressForm, line1: e.target.value })}
                  required
                  placeholder="Số nhà, tên đường"
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Địa chỉ 2</label>
                <input
                  type="text"
                  value={addressForm.line2}
                  onChange={(e) => setAddressForm({ ...addressForm, line2: e.target.value })}
                  placeholder="Tòa nhà, căn hộ (tùy chọn)"
                  className="input-field"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Phường/Xã *</label>
                  <input
                    type="text"
                    value={addressForm.ward}
                    onChange={(e) => setAddressForm({ ...addressForm, ward: e.target.value })}
                    required
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Quận/Huyện *</label>
                  <input
                    type="text"
                    value={addressForm.district}
                    onChange={(e) => setAddressForm({ ...addressForm, district: e.target.value })}
                    required
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Tỉnh/Thành phố *</label>
                  <input
                    type="text"
                    value={addressForm.city}
                    onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                    required
                    className="input-field"
                  />
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="address_default"
                  checked={addressForm.is_default}
                  onChange={(e) => setAddressForm({ ...addressForm, is_default: e.target.checked })}
                  className="h-4 w-4 text-primary-600 rounded"
                />
                <label htmlFor="address_default" className="ml-2 text-sm">
                  Đặt làm địa chỉ mặc định
                </label>
              </div>

              <div className="flex space-x-3 pt-4 border-t">
                <button type="button" onClick={() => setShowAddressModal(false)} className="btn-outline flex-1">
                  Hủy
                </button>
                <button type="submit" className="btn-primary flex-1">
                  {editingAddress ? 'Cập nhật' : 'Thêm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Profile;
