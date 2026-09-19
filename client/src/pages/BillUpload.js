
import React, { useState, useRef, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import { createTransaction, scanBill, getCategories } from '../services';
import { Button, FormInput, LoadingSpinner } from '../components/ui';

const videoConstraints = {
  width: 1280,
  height: 720,
  facingMode: 'environment',
};

const BillUpload = () => {
  const [imageSrc, setImageSrc] = useState(null);
  const [extractedDetails, setExtractedDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showWebcam, setShowWebcam] = useState(false);
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    date: '',
    category: '',
    shopName: '',
    type: 'expense',
  });

  const webcamRef = useRef(null);
  const fileInputRef = useRef(null);
  const [fileName, setFileName] = useState('');
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await getCategories();
        if (response.success) {
          setCategories(response.data);
        }
      } catch (err) {
        console.error('Error fetching categories:', err);
      }
    };

    fetchCategories();
  }, []);

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current.getScreenshot();
    setImageSrc(imageSrc);
    setShowWebcam(false);
    handleScanBill(imageSrc);
  }, [webcamRef, setImageSrc, setShowWebcam]);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const imageData = reader.result;
        setImageSrc(imageData);
        handleScanBill(imageData);
      };
      reader.readAsDataURL(file);
      setFileName(file.name);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const imageData = reader.result;
        setImageSrc(imageData);
        handleScanBill(imageData);
      };
      reader.readAsDataURL(file);
      setFileName(file.name);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleScanBill = async (image) => {
    if (!image) {
      setError('Please upload or capture a bill image to scan.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const blob = await (await fetch(image)).blob();
      const formData = new FormData();
      formData.append('bill', blob, 'bill.jpg');

      const response = await scanBill(formData);

      if (response.success) {
        setExtractedDetails(response.data);
        setFormData((prev) => ({ ...prev, ...response.data, amount: response.data.amount, date: response.data.date }));
      } else {
        setError(response.error || 'Failed to scan the bill. Please try again.');
        setExtractedDetails(null);
      }
    } catch (err) {
      const errorMessage =
        err.response && err.response.data && err.response.data.error
          ? err.response.data.error
          : 'Failed to scan the bill. Please try again.';
      console.error('Error scanning bill:', errorMessage);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTransaction = async (event) => {
    event.preventDefault();
    try {
      await createTransaction(formData);
      setSuccess('Transaction added successfully!');
      setExtractedDetails(null);
      setImageSrc(null);
      setFormData({
        description: '',
        amount: '',
        date: '',
        category: '',
        shopName: '',
        type: 'expense',
      });
    } catch (err) {
      setError('Failed to add the transaction. Please try again.');
    }
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="container mx-auto px-4 py-8 bg-cream min-h-screen max-w-7xl">
      <div
        className="mb-8 rounded-3xl p-8 relative overflow-hidden animate-fade-in-up"
        style={{
          background: 'linear-gradient(135deg, #00301e 0%, #1a4a35 100%)',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
        }}
      >
        <div className="relative z-10">
          <h1 className="text-4xl font-display font-bold mb-3 text-white">
            Scan Your Bill
          </h1>
          <p className="text-emerald-100 text-lg max-w-2xl">
            Quickly capture a receipt or upload an image and extract transaction details automatically using AI.
          </p>
        </div>

        {/* Decorative circles */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-accent-500 rounded-full opacity-10 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-emerald-400 rounded-full opacity-10 blur-2xl"></div>
      </div>

      <div className="max-w-4xl mx-auto">
        {showWebcam ? (
          <div className="mb-8 bg-black rounded-2xl overflow-hidden shadow-lg p-2">
            <Webcam
              audio={false}
              height={720}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              width={1280}
              videoConstraints={videoConstraints}
              className="rounded-xl w-full"
            />
            <div className="flex justify-center mt-4 mb-2 space-x-4">
              <Button onClick={capture} className="bg-accent-500 hover:bg-accent-600 text-white font-bold py-2 px-6 rounded-full shadow-lg transform transition hover:scale-105">Capture photo</Button>
              <Button onClick={() => setShowWebcam(false)} className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded-full">
                Close Webcam
              </Button>
            </div>
          </div>
        ) : (
          <div className="mb-8">
            <div
              onDrop={handleDrop}
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              role="button"
              tabIndex={0}
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
              className={`mt-2 flex flex-col items-center justify-center w-full min-h-[300px] px-4 py-8 border-3 rounded-3xl cursor-pointer transition-all duration-300 ${dragActive ? 'border-accent-500 bg-accent-50' : 'border-dashed border-gray-300 bg-white hover:bg-gray-50 hover:border-accent-400'}`}
            >
              <div className="text-center p-6">
                <div className="mx-auto h-24 w-24 bg-primary-50 rounded-full flex items-center justify-center mb-6">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-primary-900">
                    <path d="M12 3v10" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M8 7l4-4 4 4" stroke="#2ECC71" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <rect x="3" y="13" width="18" height="6" rx="2" stroke="currentColor" strokeWidth="2" />
                  </svg>
                </div>
                <p className="text-xl font-bold text-primary-900 mb-2">Upload Bill Image</p>
                <p className="text-gray-500 mb-4 max-w-sm mx-auto">Drag & drop or click to select an image (JPG, PNG) to automatically scan details</p>
                {fileName && <p className="text-sm font-semibold text-accent-600 bg-accent-50 px-4 py-2 rounded-full inline-block">Selected: {fileName}</p>}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            <div className="flex justify-center items-center gap-4 mt-6">
              <Button
                onClick={() => setShowWebcam(true)}
                className="px-8 py-3 bg-white border border-gray-200 text-primary-900 font-bold rounded-xl shadow-sm hover:bg-gray-50 hover:shadow-md transition-all flex items-center"
              >
                <svg className="w-5 h-5 mr-2 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Open Webcam
              </Button>
              <Button
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
                className="px-8 py-3 bg-primary-900 text-white font-bold rounded-xl shadow-md hover:bg-primary-800 hover:shadow-lg transition-all flex items-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Choose File
              </Button>
            </div>
          </div>
        )}

        {imageSrc && (
          <div className="my-8 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold mb-4 text-primary-900">Preview</h2>
            <div className="rounded-xl overflow-hidden border border-gray-200">
              <img src={imageSrc} alt="Bill" className="max-w-full h-auto block max-h-[500px] object-contain mx-auto" />
            </div>

            <div className="mt-6 flex justify-center">
              <Button
                onClick={() => handleScanBill(imageSrc)}
                disabled={isLoading || !imageSrc}
                className={`px-10 py-4 rounded-xl text-white font-bold text-lg shadow-lg flex items-center ${isLoading || !imageSrc ? 'opacity-50 cursor-not-allowed bg-gray-400' : 'bg-accent-500 hover:bg-accent-600 hover:scale-105 transition-transform'}`}
              >
                {isLoading ? <LoadingSpinner /> : (
                  <>
                    <span>Scan Bill Details</span>
                    <svg className="w-6 h-6 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </>
                )}
              </Button>
            </div>
          </div>
        )}


        {error && <p className="text-red-600 bg-red-50 p-4 rounded-xl border border-red-100 text-center font-bold mb-4">{error}</p>}
        {success && <p className="text-emerald-600 bg-emerald-50 p-4 rounded-xl border border-emerald-100 text-center font-bold mb-4">{success}</p>}

        {extractedDetails && (
          <div className="mt-8 bg-white p-8 rounded-2xl shadow-sm border border-gray-100 animate-fade-in-up">
            <h2 className="text-2xl font-bold mb-6 text-primary-900 border-b border-gray-100 pb-4">Extracted Details</h2>
            <form onSubmit={handleAddTransaction} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormInput
                  label="Description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  required
                  className="rounded-xl border-gray-200 focus:ring-accent-500 font-medium"
                />
                <div className="relative">
                  <label className="block text-sm font-bold text-gray-700 mb-1">Amount</label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-gray-400 font-bold">$</span>
                    <input
                      type="number"
                      name="amount"
                      value={formData.amount}
                      onChange={handleInputChange}
                      required
                      className="block w-full pl-6 border border-gray-200 rounded-xl py-2 px-3 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-colors font-bold"
                    />
                  </div>
                </div>
                <FormInput
                  label="Date"
                  name="date"
                  type="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  required
                  className="rounded-xl border-gray-200 focus:ring-accent-500"
                />
                <div>
                  <label htmlFor="category" className="block text-sm font-bold text-gray-700 mb-1">
                    Category
                  </label>
                  {categories && categories.length > 0 ? (
                    <>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {categories.map((cat) => {
                          const isSelected = formData.category === String(cat._id);
                          return (
                            <button
                              key={cat._id}
                              type="button"
                              onClick={() => setFormData((prev) => ({ ...prev, category: String(cat._id) }))}
                              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm focus:outline-none transition-all ${isSelected ? 'shadow-md scale-105' : 'hover:bg-gray-50'}`}
                              style={{
                                borderColor: isSelected ? (cat.color || '#D4AF37') : '#e5e7eb',
                                backgroundColor: isSelected ? `${cat.color}20` : '#ffffff',
                                color: isSelected ? '#00301e' : '#4b5563',
                                fontWeight: isSelected ? 'bold' : 'normal'
                              }}
                            >
                              <span
                                className="w-3 h-3 rounded-full inline-block"
                                style={{ backgroundColor: cat.color || '#D4AF37' }}
                              />
                              <span>{cat.name}</span>
                            </button>
                          );
                        })}
                      </div>
                      {/* keep a hidden select for form compatibility */}
                      <select id="category" name="category" value={formData.category} onChange={handleInputChange} className="hidden">
                        <option value="">Select a category</option>
                        {categories.map((cat) => (
                          <option key={cat._id} value={cat._id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </>
                  ) : (
                    <p className="mt-2 text-sm text-gray-500">No categories available. <a href="/categories" className="text-emerald-600 underline font-bold">Create categories</a> to assign transactions.</p>
                  )}
                </div>
                <FormInput
                  label="Shop Name"
                  name="shopName"
                  value={formData.shopName}
                  onChange={handleInputChange}
                  className="rounded-xl border-gray-200 focus:ring-accent-500"
                />
                <div>
                  <label htmlFor="type" className="block text-sm font-bold text-gray-700 mb-1">
                    Type
                  </label>
                  <select
                    id="type"
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    className="mt-1 block w-full pl-3 pr-10 py-2.5 text-base border-gray-200 focus:outline-none focus:ring-accent-500 focus:border-accent-500 sm:text-sm rounded-xl font-bold bg-white"
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                </div>
              </div>
              <div className="mt-8 flex justify-end">
                <Button
                  type="submit"
                  className="w-full md:w-auto px-8 py-3 bg-primary-900 hover:bg-primary-800 text-white font-bold rounded-xl shadow-lg transition-all"
                >
                  Add Transaction
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default BillUpload;