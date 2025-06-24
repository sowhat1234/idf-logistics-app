import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Users,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Phone,
  Mail,
  MapPin,
  Shield,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { apiService } from '@/lib/api';
import { User, UserRole } from '@/types';
import { getRoleDisplayName, getRoleColor, hasPermission, PERMISSIONS } from '@/lib/auth';
import { toast } from '@/hooks/use-toast';

const PersonnelManager: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [unitFilter, setUnitFilter] = useState<string>('');
  const [showBulkActions, setShowBulkActions] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: 'RESERVIST' as UserRole,
    rank: '',
    unit: '',
    personalNumber: '',
    skills: [] as string[],
    phone: '',
  });

  const canManageUsers = hasPermission(currentUser!, PERMISSIONS.MANAGE_USERS);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, roleFilter, unitFilter]);

  const loadUsers = async () => {
    try {
      const usersData = await apiService.fetchUsers();
      setUsers(usersData);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = [...users];

    if (searchTerm) {
      filtered = filtered.filter(user => 
        `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.personalNumber.includes(searchTerm)
      );
    }

    if (roleFilter && roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    if (unitFilter && unitFilter !== 'all') {
      filtered = filtered.filter(user => user.unit === unitFilter);
    }

    setFilteredUsers(filtered);
  };

  const handleCreateUser = async () => {
    if (!formData.firstName || !formData.lastName || !formData.email) {
      return;
    }

    try {
      const newUser: User = {
        id: `user-${Date.now()}`,
        username: `${formData.firstName.toLowerCase()}.${formData.lastName.toLowerCase()}`,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        role: formData.role,
        rank: formData.rank,
        unit: formData.unit,
        personalNumber: formData.personalNumber,
        skills: formData.skills,
        phone: formData.phone,
        isActive: true,
        lastLogin: '',
        createdAt: new Date().toISOString(),
      };

      setUsers(prev => [...prev, newUser]);
      setShowCreateDialog(false);
      resetForm();
    } catch (error) {
      console.error('Error creating user:', error);
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    try {
      const updatedUser: User = {
        ...editingUser,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        role: formData.role,
        rank: formData.rank,
        unit: formData.unit,
        personalNumber: formData.personalNumber,
        skills: formData.skills,
        phone: formData.phone,
      };

      setUsers(prev => 
        prev.map(user => 
          user.id === editingUser.id ? updatedUser : user
        )
      );
      
      setEditingUser(null);
      setShowCreateDialog(false);
      resetForm();
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      setUsers(prev => prev.filter(user => user.id !== userId));
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  const toggleUserStatus = async (userId: string) => {
    try {
      setUsers(prev => 
        prev.map(user => 
          user.id === userId ? { ...user, isActive: !user.isActive } : user
        )
      );
    } catch (error) {
      console.error('Error toggling user status:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      role: 'RESERVIST',
      rank: '',
      unit: '',
      personalNumber: '',
      skills: [],
      phone: '',
    });
  };

  const openEditDialog = (user: User) => {
    setEditingUser(user);
    setFormData({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      rank: user.rank,
      unit: user.unit,
      personalNumber: user.personalNumber,
      skills: user.skills,
      phone: user.phone,
    });
    setShowCreateDialog(true);
  };

  const handleSelectUser = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUsers.map(u => u.id)));
    }
  };

  const handleBulkStatusToggle = () => {
    const selectedUsersList = users.filter(u => selectedUsers.has(u.id));
    const updatedUsers = users.map(user => {
      if (selectedUsers.has(user.id)) {
        return { ...user, isActive: !user.isActive };
      }
      return user;
    });
    setUsers(updatedUsers);
    setSelectedUsers(new Set());
    
    toast({
      title: "Bulk Action Complete",
      description: `Updated status for ${selectedUsersList.length} personnel.`,
    });
  };

  const handleBulkUnitChange = (newUnit: string) => {
    const updatedUsers = users.map(user => {
      if (selectedUsers.has(user.id)) {
        return { ...user, unit: newUnit };
      }
      return user;
    });
    setUsers(updatedUsers);
    setSelectedUsers(new Set());
    
    toast({
      title: "Bulk Action Complete",
      description: `Updated unit for ${selectedUsers.size} personnel.`,
    });
  };

  const handleBulkDelete = () => {
    const updatedUsers = users.filter(u => !selectedUsers.has(u.id));
    setUsers(updatedUsers);
    
    toast({
      title: "Bulk Action Complete",
      description: `Deleted ${selectedUsers.size} personnel.`,
    });
    setSelectedUsers(new Set());
  };

  const getUniqueUnits = () => {
    const units = Array.from(new Set(users.map(u => u.unit).filter(Boolean)));
    return units;
  };

  const availableSkills = [
    'leadership', 'admin', 'security', 'guard', 'kitchen', 'maintenance', 
    'logistics', 'communications', 'training', 'weapons', 'tactics', 'squad_leadership'
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Personnel Management</h1>
          <p className="text-gray-600">Manage unit personnel and their information</p>
        </div>

        {canManageUsers && (
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                resetForm();
                setEditingUser(null);
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Personnel
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingUser ? 'Edit Personnel' : 'Add New Personnel'}
                </DialogTitle>
                <DialogDescription>
                  {editingUser ? 'Update personnel information' : 'Add a new person to the unit'}
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">First Name</label>
                  <Input
                    value={formData.firstName}
                    onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                    placeholder="First name"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700">Last Name</label>
                  <Input
                    value={formData.lastName}
                    onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                    placeholder="Last name"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Email</label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="email@idf.gov.il"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Phone</label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+972-50-1234567"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Role</label>
                  <Select 
                    value={formData.role} 
                    onValueChange={(value: UserRole) => setFormData(prev => ({ ...prev, role: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RESERVIST">Reservist</SelectItem>
                      <SelectItem value="NCO">NCO</SelectItem>
                      <SelectItem value="DUTY_OFFICER">Duty Officer</SelectItem>
                      <SelectItem value="COMMANDER">Commander</SelectItem>
                      <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Rank</label>
                  <Input
                    value={formData.rank}
                    onChange={(e) => setFormData(prev => ({ ...prev, rank: e.target.value }))}
                    placeholder="e.g., Corporal, Sergeant"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Unit</label>
                  <Input
                    value={formData.unit}
                    onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                    placeholder="e.g., Alpha Company"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Personal Number</label>
                  <Input
                    value={formData.personalNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, personalNumber: e.target.value }))}
                    placeholder="Military ID number"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Skills</label>
                <div className="grid grid-cols-3 gap-2">
                  {availableSkills.map(skill => (
                    <label key={skill} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.skills.includes(skill)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData(prev => ({ 
                              ...prev, 
                              skills: [...prev.skills, skill] 
                            }));
                          } else {
                            setFormData(prev => ({ 
                              ...prev, 
                              skills: prev.skills.filter(s => s !== skill) 
                            }));
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm">{skill}</span>
                    </label>
                  ))}
                </div>
              </div>

              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowCreateDialog(false);
                    setEditingUser(null);
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={editingUser ? handleUpdateUser : handleCreateUser}
                >
                  {editingUser ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search personnel..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>

              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All roles</SelectItem>
                  <SelectItem value="RESERVIST">Reservist</SelectItem>
                  <SelectItem value="NCO">NCO</SelectItem>
                  <SelectItem value="DUTY_OFFICER">Duty Officer</SelectItem>
                  <SelectItem value="COMMANDER">Commander</SelectItem>
                  <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                </SelectContent>
              </Select>

              <Select value={unitFilter} onValueChange={setUnitFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All units" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All units</SelectItem>
                  {getUniqueUnits().map(unit => (
                    <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Badge variant="outline">
                {filteredUsers.length} Personnel
              </Badge>
              {selectedUsers.size > 0 && (
                <Badge variant="secondary">
                  {selectedUsers.size} Selected
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedUsers.size > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">{selectedUsers.size} selected</Badge>
                <span className="text-sm text-gray-600">Bulk Actions:</span>
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={handleBulkStatusToggle}>
                  Toggle Status
                </Button>
                <Select onValueChange={handleBulkUnitChange}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Change Unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {getUniqueUnits().map(unit => (
                      <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSelectedUsers(new Set())}>
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Personnel Table */}
      <Card>
        <CardHeader>
          <CardTitle>Personnel Directory</CardTitle>
          <CardDescription>Complete list of unit personnel</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <input
                    type="checkbox"
                    checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
                    onChange={handleSelectAll}
                    className="rounded"
                  />
                </TableHead>
                <TableHead>Person</TableHead>
                <TableHead>Role & Rank</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Skills</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selectedUsers.has(user.id)}
                      onChange={() => handleSelectUser(user.id)}
                      className="rounded"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-blue-600 text-white">
                          {user.firstName[0]}{user.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{user.firstName} {user.lastName}</p>
                        <p className="text-sm text-gray-500">{user.personalNumber}</p>
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div>
                      <Badge className={getRoleColor(user.role)} variant="secondary">
                        {getRoleDisplayName(user.role)}
                      </Badge>
                      <p className="text-sm text-gray-600 mt-1">{user.rank}</p>
                      <p className="text-xs text-gray-500">{user.unit}</p>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <Mail className="h-3 w-3 text-gray-400" />
                        <span className="text-sm">{user.email}</span>
                      </div>
                      {user.phone && (
                        <div className="flex items-center space-x-2">
                          <Phone className="h-3 w-3 text-gray-400" />
                          <span className="text-sm">{user.phone}</span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.skills.slice(0, 3).map(skill => (
                        <Badge key={skill} variant="outline" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                      {user.skills.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{user.skills.length - 3}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {user.isActive ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                      <span className="text-sm">
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSelectedUser(user)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        {canManageUsers && (
                          <>
                            <DropdownMenuItem onClick={() => openEditDialog(user)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => toggleUserStatus(user.id)}
                              className={user.isActive ? 'text-red-600' : 'text-green-600'}
                            >
                              {user.isActive ? (
                                <>
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Activate
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteUser(user.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* User Details Modal */}
      {selectedUser && (
        <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-3">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-blue-600 text-white">
                    {selectedUser.firstName[0]}{selectedUser.lastName[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p>{selectedUser.rank} {selectedUser.firstName} {selectedUser.lastName}</p>
                  <p className="text-sm text-gray-500">{selectedUser.unit}</p>
                </div>
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Contact Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center space-x-2">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <span>{selectedUser.email}</span>
                    </div>
                    {selectedUser.phone && (
                      <div className="flex items-center space-x-2">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <span>{selectedUser.phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Military Details</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-gray-600">Personal Number:</span> {selectedUser.personalNumber}</p>
                    <p><span className="text-gray-600">Role:</span> {getRoleDisplayName(selectedUser.role)}</p>
                    <p><span className="text-gray-600">Status:</span> {selectedUser.isActive ? 'Active' : 'Inactive'}</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">Skills & Qualifications</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedUser.skills.map(skill => (
                    <Badge key={skill} variant="outline">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="text-xs text-gray-500 pt-4 border-t">
                <p>Created: {new Date(selectedUser.createdAt).toLocaleDateString()}</p>
                {selectedUser.lastLogin && (
                  <p>Last Login: {new Date(selectedUser.lastLogin).toLocaleDateString()}</p>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default PersonnelManager;
