import React, { useState, useEffect } from 'react';
import { Plus, X, AlertCircle } from 'lucide-react';
import {
  getRoomTypes, createRoomType, updateRoomType, deleteRoomType,
  getMealTypes, createMealType, updateMealType, deleteMealType
} from '../../../services/settingService';
import ConfirmModal from '../../../components/ui/ConfirmModal';

export interface RoomType {
  id: string;
  name: string;
  status: 'Active' | 'Inactive';
}

export interface MealType {
  id: string;
  name: string;
  status: 'Active' | 'Inactive';
}

const HBManagementTab: React.FC = () => {
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [mealTypes, setMealTypes] = useState<MealType[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [loadingMeals, setLoadingMeals] = useState(false);

  // Feedback states
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<'success' | 'error'>('success');

  // Modals state
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<RoomType | null>(null);
  const [roomNameInput, setRoomNameInput] = useState('');
  const [roomStatusInput, setRoomStatusInput] = useState<'Active' | 'Inactive'>('Active');

  const [isMealModalOpen, setIsMealModalOpen] = useState(false);
  const [editingMeal, setEditingMeal] = useState<MealType | null>(null);
  const [mealNameInput, setMealNameInput] = useState('');
  const [mealStatusInput, setMealStatusInput] = useState<'Active' | 'Inactive'>('Active');

  // Confirm Modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { },
  });

  // Load Room Types & Meal Types
  const loadData = async () => {
    setLoadingRooms(true);
    setLoadingMeals(true);
    try {
      const roomsData = await getRoomTypes();
      if (roomsData) setRoomTypes(roomsData);
    } catch (err) {
      console.error('Failed to load room types:', err);
    } finally {
      setLoadingRooms(false);
    }

    try {
      const mealsData = await getMealTypes();
      if (mealsData) setMealTypes(mealsData);
    } catch (err) {
      console.error('Failed to load meal types:', err);
    } finally {
      setLoadingMeals(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const triggerFeedback = (message: string, type: 'success' | 'error' = 'success') => {
    setFeedback(message);
    setFeedbackType(type);
    setTimeout(() => setFeedback(null), 3000);
  };

  // ROOM TYPE HANDLERS
  const handleOpenAddRoom = () => {
    setEditingRoom(null);
    setRoomNameInput('');
    setRoomStatusInput('Active');
    setIsRoomModalOpen(true);
  };

  const handleOpenEditRoom = (room: RoomType) => {
    setEditingRoom(room);
    setRoomNameInput(room.name);
    setRoomStatusInput(room.status);
    setIsRoomModalOpen(true);
  };

  const handleSaveRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomNameInput.trim()) {
      triggerFeedback('Room type name is required', 'error');
      return;
    }

    try {
      if (editingRoom) {
        // Edit Room
        const updated = await updateRoomType(editingRoom.id, {
          name: roomNameInput.trim(),
          status: roomStatusInput
        });
        setRoomTypes(prev => prev.map(r => r.id === editingRoom.id ? updated : r));
        triggerFeedback('Room type updated successfully!');
      } else {
        // Add Room
        const saved = await createRoomType({
          name: roomNameInput.trim(),
          status: roomStatusInput
        });
        setRoomTypes(prev => [...prev, saved]);
        triggerFeedback('Room type created successfully!');
      }
      setIsRoomModalOpen(false);
    } catch (err: any) {
      console.error('Failed to save room type:', err);
      triggerFeedback(err.response?.data?.message || 'Failed to save room type', 'error');
    }
  };

  const handleDeleteRoom = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Room Type',
      message: 'Are you sure you want to delete this room type? This action cannot be undone.',
      onConfirm: async () => {
        try {
          await deleteRoomType(id);
          setRoomTypes(prev => prev.filter(r => r.id !== id));
          triggerFeedback('Room type deleted successfully!');
        } catch (err) {
          console.error('Failed to delete room type:', err);
          triggerFeedback('Failed to delete room type', 'error');
        }
      }
    });
  };

  // MEAL TYPE HANDLERS
  const handleOpenAddMeal = () => {
    setEditingMeal(null);
    setMealNameInput('');
    setMealStatusInput('Active');
    setIsMealModalOpen(true);
  };

  const handleOpenEditMeal = (meal: MealType) => {
    setEditingMeal(meal);
    setMealNameInput(meal.name);
    setMealStatusInput(meal.status);
    setIsMealModalOpen(true);
  };

  const handleSaveMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mealNameInput.trim()) {
      triggerFeedback('Meal type name is required', 'error');
      return;
    }

    try {
      if (editingMeal) {
        // Edit Meal
        const updated = await updateMealType(editingMeal.id, {
          name: mealNameInput.trim(),
          status: mealStatusInput
        });
        setMealTypes(prev => prev.map(m => m.id === editingMeal.id ? updated : m));
        triggerFeedback('Meal type updated successfully!');
      } else {
        // Add Meal
        const saved = await createMealType({
          name: mealNameInput.trim(),
          status: mealStatusInput
        });
        setMealTypes(prev => [...prev, saved]);
        triggerFeedback('Meal type created successfully!');
      }
      setIsMealModalOpen(false);
    } catch (err: any) {
      console.error('Failed to save meal type:', err);
      triggerFeedback(err.response?.data?.message || 'Failed to save meal type', 'error');
    }
  };

  const handleDeleteMeal = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Meal Type',
      message: 'Are you sure you want to delete this meal type? This action cannot be undone.',
      onConfirm: async () => {
        try {
          await deleteMealType(id);
          setMealTypes(prev => prev.filter(m => m.id !== id));
          triggerFeedback('Meal type deleted successfully!');
        } catch (err) {
          console.error('Failed to delete meal type:', err);
          triggerFeedback('Failed to delete meal type', 'error');
        }
      }
    });
  };

  return (
    <div className="space-y-8 animate-fade-in font-sans text-slate-800 pb-12">
      {/* Toast Alert Banner */}
      {feedback && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center space-x-2 px-4 py-3 rounded-xl shadow-lg border text-xs font-bold font-sans animate-fade-in ${feedbackType === 'success'
            ? 'bg-[#ecfdf5] border-[#10b981]/30 text-[#065f46]'
            : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}>
          {feedbackType === 'success' ? (
            <span className="text-emerald-500">✓</span>
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-500" />
          )}
          <span>{feedback}</span>
        </div>
      )}

      {/* SECTION 1: ROOM TYPES */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-[16px] font-bold text-slate-800">Room Type</h3>
            <p className="text-[11px] text-slate-400 font-sans mt-0.5">Manage the types of rooms available in your property</p>
          </div>
          <button
            onClick={handleOpenAddRoom}
            className="flex items-center space-x-1.5 px-4 py-2 bg-[#f59e0b] hover:bg-[#d97706] text-white rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer border-none"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Room Type</span>
          </button>
        </div>

        <div className="overflow-x-auto w-full border border-slate-100 rounded-lg">
          <table className="w-full text-left text-xs font-sans">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[9px] select-none">
                <th className="py-2.5 px-4">Name</th>
                <th className="py-2.5 px-4 text-center w-24">Status</th>
                <th className="py-2.5 px-4 text-center w-36">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[#334155] font-medium">
              {loadingRooms ? (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-slate-400 font-sans italic">Loading room types...</td>
                </tr>
              ) : roomTypes.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-slate-400 font-sans italic">No room types configured.</td>
                </tr>
              ) : (
                roomTypes.map(room => (
                  <tr key={room.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-800">{room.name}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold ${room.status === 'Active'
                          ? 'bg-emerald-50 text-emerald-600'
                          : 'bg-rose-50 text-rose-600'
                        }`}>
                        {room.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center space-x-3">
                        <button
                          onClick={() => handleOpenEditRoom(room)}
                          className="text-[#f59e0b] hover:text-[#d97706] font-bold text-[11px] border-none bg-transparent cursor-pointer font-sans"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteRoom(room.id)}
                          className="text-rose-600 hover:text-rose-800 font-bold text-[11px] border-none bg-transparent cursor-pointer font-sans"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 2: MEAL TYPES */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-[16px] font-bold text-slate-800">Meal Type</h3>
            <p className="text-[11px] text-slate-400 font-sans mt-0.5">Manage meal plan options for guests</p>
          </div>
          <button
            onClick={handleOpenAddMeal}
            className="flex items-center space-x-1.5 px-4 py-2 bg-[#f59e0b] hover:bg-[#d97706] text-white rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer border-none"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Meal Type</span>
          </button>
        </div>

        <div className="overflow-x-auto w-full border border-slate-100 rounded-lg">
          <table className="w-full text-left text-xs font-sans">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[9px] select-none">
                <th className="py-2.5 px-4">Name</th>
                <th className="py-2.5 px-4 text-center w-24">Status</th>
                <th className="py-2.5 px-4 text-center w-36">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[#334155] font-medium">
              {loadingMeals ? (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-slate-400 font-sans italic">Loading meal types...</td>
                </tr>
              ) : mealTypes.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-slate-400 font-sans italic">No meal types configured.</td>
                </tr>
              ) : (
                mealTypes.map(meal => (
                  <tr key={meal.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-800">{meal.name}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold ${meal.status === 'Active'
                          ? 'bg-emerald-50 text-emerald-600'
                          : 'bg-rose-50 text-rose-600'
                        }`}>
                        {meal.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center space-x-3">
                        <button
                          onClick={() => handleOpenEditMeal(meal)}
                          className="text-[#f59e0b] hover:text-[#d97706] font-bold text-[11px] border-none bg-transparent cursor-pointer font-sans"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteMeal(meal.id)}
                          className="text-rose-600 hover:text-rose-800 font-bold text-[11px] border-none bg-transparent cursor-pointer font-sans"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: ADD / EDIT ROOM TYPE */}
      {isRoomModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden animate-fade-in border border-slate-100 p-6 space-y-5 font-sans text-[#0f172a]">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800">
                {editingRoom ? 'Edit Room Type' : 'Add Room Type'}
              </h3>
              <button
                onClick={() => setIsRoomModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRoom} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Room Type Name</label>
                <input
                  type="text"
                  placeholder="e.g. Deluxe Ocean View Suite"
                  value={roomNameInput}
                  onChange={(e) => setRoomNameInput(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all text-slate-800"
                />
              </div>

              <div className="flex items-center justify-between py-2 border-t border-b border-slate-50">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Status</label>
                  <span className="text-[10px] text-slate-400">Set whether this room type is immediately available for booking</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`text-[10px] font-bold ${roomStatusInput === 'Active' ? 'text-amber-500' : 'text-slate-400'}`}>
                    {roomStatusInput}
                  </span>
                  <button
                    type="button"
                    onClick={() => setRoomStatusInput(prev => prev === 'Active' ? 'Inactive' : 'Active')}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${roomStatusInput === 'Active' ? 'bg-[#f59e0b]' : 'bg-slate-200'
                      }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${roomStatusInput === 'Active' ? 'translate-x-4' : 'translate-x-0'
                        }`}
                    />
                  </button>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRoomModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded-lg text-xs transition-all bg-white cursor-pointer border-solid"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#f59e0b] hover:bg-[#d97706] text-white font-bold rounded-lg text-xs transition-all cursor-pointer border-none shadow-sm"
                >
                  {editingRoom ? 'Save Changes' : 'Add Room Type'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD / EDIT MEAL TYPE */}
      {isMealModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden animate-fade-in border border-slate-100 p-6 space-y-5 font-sans text-[#0f172a]">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800">
                {editingMeal ? 'Edit Meal Type' : 'Add Meal Type'}
              </h3>
              <button
                onClick={() => setIsMealModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMeal} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Meal Type Name</label>
                <input
                  type="text"
                  placeholder="e.g. Ultra All Inclusive"
                  value={mealNameInput}
                  onChange={(e) => setMealNameInput(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all text-slate-800"
                />
              </div>

              <div className="flex items-center justify-between py-2 border-t border-b border-slate-50">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Status</label>
                  <span className="text-[10px] text-slate-400">Set whether this meal plan is active and selectable</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`text-[10px] font-bold ${mealStatusInput === 'Active' ? 'text-amber-500' : 'text-slate-400'}`}>
                    {mealStatusInput}
                  </span>
                  <button
                    type="button"
                    onClick={() => setMealStatusInput(prev => prev === 'Active' ? 'Inactive' : 'Active')}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${mealStatusInput === 'Active' ? 'bg-[#f59e0b]' : 'bg-slate-200'
                      }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${mealStatusInput === 'Active' ? 'translate-x-4' : 'translate-x-0'
                        }`}
                    />
                  </button>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsMealModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded-lg text-xs transition-all bg-white cursor-pointer border-solid"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#f59e0b] hover:bg-[#d97706] text-white font-bold rounded-lg text-xs transition-all cursor-pointer border-none shadow-sm"
                >
                  {editingMeal ? 'Save Changes' : 'Add Meal Type'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Custom Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
      />
    </div>
  );
};

export default HBManagementTab;
