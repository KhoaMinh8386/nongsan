import { Check, Package, Truck, MapPin, CheckCircle, XCircle } from 'lucide-react';

const OrderStatusStepper = ({ currentStatus, statusHistory = [] }) => {
  // Define order steps
  const steps = [
    { 
      status: 'PENDING', 
      label: 'Đặt hàng', 
      icon: Package,
      description: 'Đơn hàng đã được tạo'
    },
    { 
      status: 'PROCESSING', 
      label: 'Xử lý', 
      icon: Package,
      description: 'Đang chuẩn bị hàng'
    },
    { 
      status: 'SHIPPING', 
      label: 'Đang giao', 
      icon: Truck,
      description: 'Shipper đang giao hàng'
    },
    { 
      status: 'DRIVER_ARRIVED', 
      label: 'Đã đến', 
      icon: MapPin,
      description: 'Tài xế đã đến nơi'
    },
    { 
      status: 'DELIVERED', 
      label: 'Hoàn thành', 
      icon: CheckCircle,
      description: 'Giao hàng thành công'
    },
  ];

  // Handle failed/cancelled status
  if (currentStatus === 'FAILED' || currentStatus === 'CANCELLED') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center justify-center">
          <XCircle className="h-12 w-12 text-red-500 mr-3" />
          <div>
            <p className="text-xl font-bold text-red-700">
              {currentStatus === 'FAILED' ? 'Giao hàng thất bại' : 'Đơn hàng đã bị hủy'}
            </p>
            <p className="text-sm text-red-600 mt-1">
              {currentStatus === 'FAILED' 
                ? 'Không thể giao hàng. Vui lòng liên hệ hỗ trợ.'
                : 'Đơn hàng của bạn đã bị hủy.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Get current step index
  const currentStepIndex = steps.findIndex(step => step.status === currentStatus);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-bold mb-6">Trạng thái đơn hàng</h3>
      
      {/* Stepper */}
      <div className="relative">
        {/* Progress Line */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200">
          <div 
            className="h-full bg-green-500 transition-all duration-500"
            style={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
          />
        </div>

        {/* Steps */}
        <div className="relative flex justify-between">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isCompleted = index < currentStepIndex;
            const isCurrent = index === currentStepIndex;
            const isPending = index > currentStepIndex;

            return (
              <div key={step.status} className="flex flex-col items-center flex-1">
                {/* Circle */}
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                    isCompleted
                      ? 'bg-green-500 border-green-500'
                      : isCurrent
                      ? 'bg-primary-600 border-primary-600 ring-4 ring-primary-100'
                      : 'bg-white border-gray-300'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5 text-white" />
                  ) : (
                    <Icon
                      className={`h-5 w-5 ${
                        isCurrent ? 'text-white' : 'text-gray-400'
                      }`}
                    />
                  )}
                </div>

                {/* Label */}
                <div className="text-center mt-2">
                  <p
                    className={`text-sm font-medium ${
                      isCompleted || isCurrent
                        ? 'text-gray-900'
                        : 'text-gray-500'
                    }`}
                  >
                    {step.label}
                  </p>
                  <p
                    className={`text-xs mt-1 ${
                      isCompleted || isCurrent
                        ? 'text-gray-600'
                        : 'text-gray-400'
                    }`}
                  >
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Status History Timeline */}
      {statusHistory.length > 0 && (
        <div className="mt-8 pt-8 border-t">
          <h4 className="text-sm font-semibold text-gray-700 mb-4">Lịch sử cập nhật</h4>
          <div className="space-y-3">
            {statusHistory.map((history, index) => (
              <div key={index} className="flex items-start">
                <div className="flex-shrink-0 w-2 h-2 bg-primary-600 rounded-full mt-2"></div>
                <div className="ml-3 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">
                      {getStatusLabel(history.new_status)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDateTime(history.created_at)}
                    </p>
                  </div>
                  {history.note && (
                    <p className="text-xs text-gray-600 mt-1">{history.note}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Helper functions
const getStatusLabel = (status) => {
  const labels = {
    PENDING: 'Đơn hàng đã được tạo',
    PROCESSING: 'Đang xử lý đơn hàng',
    SHIPPING: 'Đang giao hàng',
    DRIVER_ARRIVED: 'Tài xế đã đến nơi',
    DELIVERED: 'Giao hàng thành công',
    FAILED: 'Giao hàng thất bại',
    CANCELLED: 'Đơn hàng đã bị hủy',
  };
  return labels[status] || status;
};

const formatDateTime = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default OrderStatusStepper;
