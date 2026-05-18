import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  Upload, 
  Download, 
  Trash2,
  Search,
  File,
  Filter,
  Calendar,
  X,
  AlertTriangle,
  Plus,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { FILE_CATEGORIES, MAX_FILE_SIZE, API_URL } from '../config/constants';
import axios from 'axios';

interface MedicalFile {
  id: number;
  name: string;
  original_name: string;
  file_size: number;
  file_type: string;
  category: string;
  upload_date: string;
}

export default function MedicalFiles() {
  const [files, setFiles] = useState<MedicalFile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<MedicalFile | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [newFile, setNewFile] = useState<File | null>(null);
  const [newFileCategory, setNewFileCategory] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch files on component mount
  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`${API_URL}/files`);
      setFiles(response.data);
    } catch (error) {
      console.error('Error fetching files:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter files based on search query and category
  const filteredFiles = files.filter(file => {
    const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory ? file.category === selectedCategory : true;
    return matchesSearch && matchesCategory;
  });

  // Format file size for display
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setUploadError(null);
    
    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        setUploadError(`File size exceeds the maximum limit (${formatFileSize(MAX_FILE_SIZE)})`);
        return;
      }
      
      setNewFile(file);
    }
  };

  const handleUpload = async () => {
    if (!newFile || !newFileCategory) {
      setUploadError('Please select a file and category');
      return;
    }
    
    try {
      const formData = new FormData();
      formData.append('file', newFile);
      formData.append('category', newFileCategory);
      
      await axios.post(`${API_URL}/files`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      // Refresh files list
      await fetchFiles();
      
      // Reset form and close modal
      setNewFile(null);
      setNewFileCategory('');
      setShowUploadModal(false);
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      setUploadError('Failed to upload file. Please try again.');
    }
  };

  const handleDeleteFile = async () => {
    if (selectedFile) {
      try {
        await axios.delete(`${API_URL}/files/${selectedFile.id}`);
        await fetchFiles();
        setSelectedFile(null);
        setShowDeleteConfirm(false);
      } catch (error) {
        console.error('Error deleting file:', error);
      }
    }
  };

  const handleDownload = async (file: MedicalFile) => {
    try {
      const response = await axios.get(`${API_URL}/files/${file.id}/download`, {
        responseType: 'blob'
      });
      
      // Create a blob URL and trigger download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', file.name);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-2">Medical Files</h1>
        <p className="text-neutral-500">
          Store and manage your medical reports, test results, and other health documents
        </p>
      </div>
      
      {/* Actions bar */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-neutral-400" />
          <input
            type="text"
            placeholder="Search files by name..."
            className="input pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex gap-2">
          <div className="relative">
            <button
              className="btn btn-outline flex items-center"
              onClick={() => setSelectedCategory(null)}
            >
              <Filter size={16} className="mr-2" />
              <span>{selectedCategory || 'All Categories'}</span>
            </button>
            
            {selectedCategory && (
              <button
                className="absolute right-2 top-2.5"
                onClick={() => setSelectedCategory(null)}
              >
                <X size={16} className="text-neutral-500 hover:text-neutral-700" />
              </button>
            )}
          </div>
          
          <button
            className="btn btn-primary"
            onClick={() => setShowUploadModal(true)}
          >
            <Upload size={16} className="mr-2" />
            Upload
          </button>
        </div>
      </div>
      
      {/* Categories */}
      <div className="flex overflow-x-auto pb-2 mb-6 gap-2">
        {FILE_CATEGORIES.map(category => (
          <button
            key={category}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              selectedCategory === category
                ? 'bg-primary-100 text-primary-700'
                : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
            }`}
            onClick={() => setSelectedCategory(selectedCategory === category ? null : category)}
          >
            {category}
          </button>
        ))}
      </div>
      
      {/* Files list */}
      <div className="card mb-8">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left border-b border-neutral-200">
                <th className="pb-3 pl-4 pr-2 font-medium text-neutral-500">Name</th>
                <th className="pb-3 px-2 font-medium text-neutral-500">Category</th>
                <th className="pb-3 px-2 font-medium text-neutral-500">Date</th>
                <th className="pb-3 px-2 font-medium text-neutral-500">Size</th>
                <th className="pb-3 px-2 font-medium text-neutral-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredFiles.length > 0 ? (
                filteredFiles.map((file) => (
                  <tr 
                    key={file.id}
                    className="border-b border-neutral-100 hover:bg-neutral-50 transition-colors"
                  >
                    <td className="py-3 pl-4 pr-2">
                      <div className="flex items-center">
                        <FileText size={16} className="text-primary-500 mr-2" />
                        <span className="font-medium">{file.original_name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <span className="px-2 py-1 bg-neutral-100 rounded-full text-xs">
                        {file.category}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-neutral-600">
                      {new Date(file.upload_date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-2 text-neutral-600">
                      {formatFileSize(file.file_size)}
                    </td>
                    <td className="py-3 px-2 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          className="p-1.5 hover:bg-neutral-100 rounded-full"
                          title="Download"
                          onClick={() => handleDownload(file)}
                        >
                          <Download size={16} className="text-neutral-600" />
                        </button>
                        <button
                          className="p-1.5 hover:bg-neutral-100 rounded-full"
                          title="View file details"
                          onClick={() => setSelectedFile(file)}
                        >
                          <ChevronRight size={16} className="text-neutral-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-neutral-500">
                    {searchQuery || selectedCategory ? (
                      <div>
                        <Search size={24} className="mx-auto mb-2 text-neutral-400" />
                        <p>No files match your search criteria</p>
                        <button 
                          className="text-primary-600 mt-2 hover:underline"
                          onClick={() => {
                            setSearchQuery('');
                            setSelectedCategory(null);
                          }}
                        >
                          Clear filters
                        </button>
                      </div>
                    ) : (
                      <div>
                        <File size={24} className="mx-auto mb-2 text-neutral-400" />
                        <p>No medical files uploaded yet</p>
                        <button 
                          className="text-primary-600 mt-2 hover:underline"
                          onClick={() => setShowUploadModal(true)}
                        >
                          Upload your first file
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg shadow-xl max-w-md w-full"
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">Upload Medical File</h2>
                  <button
                    onClick={() => {
                      setShowUploadModal(false);
                      setNewFile(null);
                      setNewFileCategory('');
                      setUploadError(null);
                    }}
                    className="text-neutral-400 hover:text-neutral-600"
                  >
                    <X size={20} />
                  </button>
                </div>
                
                <div className="space-y-4">
                  {/* File input */}
                  <div>
                    <label className="form-label">Select File</label>
                    <div className="border-2 border-dashed border-neutral-300 rounded-lg p-6 text-center hover:border-primary-300 transition-colors">
                      {newFile ? (
                        <div className="flex items-center justify-center">
                          <FileText size={24} className="text-primary-500 mr-2" />
                          <div className="text-left">
                            <p className="font-medium">{newFile.name}</p>
                            <p className="text-sm text-neutral-500">{formatFileSize(newFile.size)}</p>
                          </div>
                          <button
                            onClick={() => {
                              setNewFile(null);
                              if (fileInputRef.current) {
                                fileInputRef.current.value = '';
                              }
                            }}
                            className="ml-4 text-neutral-400 hover:text-neutral-600"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <div
                          className="cursor-pointer"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Upload size={24} className="mx-auto mb-2 text-neutral-400" />
                          <p className="mb-1 font-medium">Click to upload or drag and drop</p>
                          <p className="text-sm text-neutral-500">
                            PDF, DOCX, JPEG, PNG (max. {formatFileSize(MAX_FILE_SIZE)})
                          </p>
                        </div>
                      )}
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        accept=".pdf,.docx,.doc,.jpg,.jpeg,.png"
                        onChange={handleFileSelect}
                      />
                    </div>
                  </div>
                  
                  {/* Category selection */}
                  <div>
                    <label className="form-label">File Category</label>
                    <select
                      className="input"
                      value={newFileCategory}
                      onChange={(e) => setNewFileCategory(e.target.value)}
                    >
                      <option value="">Select a category</option>
                      {FILE_CATEGORIES.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Error message */}
                  {uploadError && (
                    <div className="bg-error-50 text-error-600 p-3 rounded-lg flex items-start">
                      <AlertTriangle size={16} className="mr-2 mt-0.5 flex-shrink-0" />
                      <p className="text-sm">{uploadError}</p>
                    </div>
                  )}
                </div>
                
                <div className="mt-6 flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setShowUploadModal(false);
                      setNewFile(null);
                      setNewFileCategory('');
                      setUploadError(null);
                    }}
                    className="btn btn-ghost"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpload}
                    className="btn btn-primary"
                    disabled={!newFile || !newFileCategory}
                  >
                    Upload File
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* File Details Panel */}
      <AnimatePresence>
        {selectedFile && (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className="fixed inset-y-0 right-0 w-full sm:w-96 bg-white shadow-lg z-30"
          >
            <div className="p-6 h-full flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <button
                  onClick={() => setSelectedFile(null)}
                  className="p-2 hover:bg-neutral-100 rounded-lg"
                >
                  <ChevronLeft size={20} />
                </button>
                <h2 className="text-lg font-semibold">File Details</h2>
                <div className="w-8"></div> {/* Spacer for alignment */}
              </div>
              
              <div className="flex-1 overflow-y-auto">
                <div className="mb-6 text-center">
                  <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <FileText size={28} className="text-primary-600" />
                  </div>
                  <h3 className="font-medium mb-1">{selectedFile.original_name}</h3>
                  <p className="text-sm text-neutral-500">
                    {formatFileSize(selectedFile.file_size)}
                  </p>
                </div>
                
                <div className="space-y-4">
                  <div className="p-4 bg-neutral-50 rounded-lg">
                    <p className="text-sm text-neutral-500 mb-1">Category</p>
                    <p className="font-medium">{selectedFile.category}</p>
                  </div>
                  
                  <div className="p-4 bg-neutral-50 rounded-lg">
                    <p className="text-sm text-neutral-500 mb-1">Upload Date</p>
                    <p className="font-medium">{new Date(selectedFile.upload_date).toLocaleDateString()}</p>
                  </div>
                  
                  <div className="p-4 bg-neutral-50 rounded-lg">
                    <p className="text-sm text-neutral-500 mb-1">File Type</p>
                    <p className="font-medium">
                      {selectedFile.file_type.split('/')[1]?.toUpperCase() || selectedFile.original_name.split('.').pop()?.toUpperCase()}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 pt-6 border-t border-neutral-200">
                <button
                  className="btn btn-primary w-full mb-3"
                  onClick={() => handleDownload(selectedFile)}
                >
                  <Download size={16} className="mr-2" />
                  Download
                </button>
                
                <button
                  className="btn btn-outline w-full text-error-600 hover:bg-error-50"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 size={16} className="mr-2" />
                  Delete
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Delete Confirmation */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
            >
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-error-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle size={24} className="text-error-600" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Delete File</h2>
                <p className="text-neutral-600">
                  Are you sure you want to delete "{selectedFile?.original_name}"? This action cannot be undone.
                </p>
              </div>
              
              <div className="flex gap-3">
                <button
                  className="btn btn-outline flex-1"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn flex-1 bg-error-600 hover:bg-error-700 text-white"
                  onClick={handleDeleteFile}
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}