import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Stack,
  TextField,
  Typography,
  MenuItem,
  InputAdornment
} from '@mui/material';
import { useForm } from 'react-hook-form';
import { useInventoryStore } from '../hooks/useInventoryStore';
import apiClient from '../services/apiClient';
import type { Ingredient } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { RequirePermission } from '../components/auth/RequirePermission';
import SearchIcon from '@mui/icons-material/Search';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

type IngredientFormValues = {
  name: string;
  sku: string;
  stock: number;
  stockUnit: 'u' | 'g' | 'ml';
  purchaseUnit: string;
  conversionFactor: number;
  conversionUnit: 'u' | 'g' | 'ml';
  reorderPoint: number;
  category: 'bebida' | 'cafe' | 'condimentos' | 'frutas' | 'cereales' | 'lacteos' | 'otros' | 'proteinas' | 'vegetales';
  allergens: string[];
  codeArticlePurchase: string;
};

const defaultValues: IngredientFormValues = {
  name: '',
  sku: '',
  stock: 0,
  stockUnit: 'g',
  purchaseUnit: 'unidad',
  conversionFactor: 1,
  conversionUnit: 'g',
  reorderPoint: 0,
  category: 'otros',
  allergens: [],
  codeArticlePurchase: ''
};

const IngredientsPage = () => {
  const { hasPermission } = useAuth();
  const { ingredients, fetchIngredients, error } = useInventoryStore((state) => ({
    ingredients: state.ingredients,
    fetchIngredients: state.fetchIngredients,
    error: state.error
  }));
  const [open, setOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | 'duplicate'>('create');
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Ingredient | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting }
  } = useForm<IngredientFormValues>({ defaultValues });

  useEffect(() => {
    void fetchIngredients();
  }, [fetchIngredients]);

  const filteredIngredients = useMemo(() => {
    const normalizedTerm = searchTerm.trim().toLowerCase();
    // Filtrar categorías que tradicionalmente eran "ingredient"
    const ingredientCategories = ['condimentos', 'frutas', 'cereales', 'lacteos', 'otros', 'proteinas', 'vegetales'];
    return ingredients
      .filter((ingredient) => ingredientCategories.includes(ingredient.category))
      .filter((ingredient) => ingredient.name.toLowerCase().includes(normalizedTerm));
  }, [ingredients, searchTerm]);

  const handleOpen = () => {
    setDialogMode('create');
    setSelectedIngredient(null);
    reset(defaultValues);
    setOpen(true);
  };

  const handleEdit = (ingredient: Ingredient) => {
    setDialogMode('edit');
    setSelectedIngredient(ingredient);
    reset({
      name: ingredient.name,
      sku: ingredient.sku ?? '',
      stock: ingredient.stock,
      stockUnit: ingredient.stockUnit ?? 'g',
      purchaseUnit: ingredient.purchaseUnit ?? 'unidad',
      conversionFactor: ingredient.conversionFactor ?? 1,
      conversionUnit: ingredient.conversionUnit ?? 'g',
      reorderPoint: ingredient.reorderPoint ?? 0,
      category: ingredient.category ?? 'otros',
      allergens: ingredient.allergens ?? [],
      codeArticlePurchase: ingredient.codeArticlePurchase ?? ''
    });
    setOpen(true);
  };

  const handleDuplicate = (ingredient: Ingredient) => {
    setDialogMode('duplicate');
    setSelectedIngredient(ingredient);
    reset({
      name: `${ingredient.name} (copia)`,
      sku: `${ingredient.sku ?? ''}-COPY`,
      stock: ingredient.stock,
      stockUnit: ingredient.stockUnit ?? 'g',
      purchaseUnit: ingredient.purchaseUnit ?? 'unidad',
      conversionFactor: ingredient.conversionFactor ?? 1,
      conversionUnit: ingredient.conversionUnit ?? 'g',
      reorderPoint: ingredient.reorderPoint ?? 0,
      category: ingredient.category ?? 'otros',
      allergens: ingredient.allergens ?? [],
      codeArticlePurchase: ingredient.codeArticlePurchase ?? ''
    });
    setOpen(true);
  };

  const handleDelete = (ingredient: Ingredient) => {
    setConfirmDelete(ingredient);
  };

  const confirmDeleteIngredient = async () => {
    if (!confirmDelete) return;
    await apiClient.delete(`/ingredients/${confirmDelete._id}`);
    setConfirmDelete(null);
    await fetchIngredients();
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedIngredient(null);
  };

  const onSubmit = handleSubmit(async (values) => {
    if (dialogMode === 'edit' && selectedIngredient) {
      await apiClient.put<Ingredient>(`/ingredients/${selectedIngredient._id}`, values);
    } else {
      await apiClient.post<Ingredient>('/ingredients', values);
    }
    setOpen(false);
    setSelectedIngredient(null);
    await fetchIngredients();
  });

  const dialogTitle =
    dialogMode === 'edit'
      ? 'Editar ingrediente'
      : dialogMode === 'duplicate'
      ? 'Duplicar ingrediente'
      : 'Nuevo ingrediente';

  return (
    <Grid container spacing={3} sx={{ py: 0 }}>
      <Grid item xs={12}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h4">Ingredientes</Typography>
          <RequirePermission resource="ingredients" action="create" hide>
            <Button variant="contained" onClick={handleOpen}>
              Nuevo ingrediente
            </Button>
          </RequirePermission>
        </Stack>
      </Grid>
      {error && (
        <Grid item xs={12}>
          <Alert severity="error">{error}</Alert>
        </Grid>
      )}
      <Grid item xs={12}>
        <TextField
          fullWidth
          placeholder="Buscar ingredientes"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            )
          }}
        />
      </Grid>
      {filteredIngredients.map((ingredient) => (
        <Grid item xs={12} md={6} key={ingredient._id}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6">{ingredient.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                Categoría: Ingrediente
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Stock: {ingredient.stock}{' '}
                {ingredient.stockUnit ?? ingredient.productUnit ?? 'g'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Punto de pedido: {ingredient.reorderPoint}{' '}
                {ingredient.stockUnit ?? ingredient.productUnit ?? 'g'}
              </Typography>
              <Stack direction="row" spacing={1.5} sx={{ mt: 2 }}>
                <RequirePermission resource="ingredients" action="update" hide>
                  <Button
                    size="small"
                    startIcon={<EditOutlinedIcon fontSize="small" />}
                    onClick={() => handleEdit(ingredient)}
                  >
                    Editar
                  </Button>
                </RequirePermission>
                <RequirePermission resource="ingredients" action="create" hide>
                  <Button
                    size="small"
                    startIcon={<ContentCopyIcon fontSize="small" />}
                    onClick={() => handleDuplicate(ingredient)}
                  >
                    Duplicar
                  </Button>
                </RequirePermission>
                <RequirePermission resource="ingredients" action="delete" hide>
                  <Button
                    size="small"
                    color="error"
                    startIcon={<DeleteOutlineIcon fontSize="small" />}
                    onClick={() => handleDelete(ingredient)}
                  >
                    Eliminar
                  </Button>
                </RequirePermission>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      ))}

      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogTitle>{dialogTitle}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Nombre" {...register('name', { required: true })} />
            <TextField label="SKU" {...register('sku', { required: true })} />
            <TextField label="Stock inicial" type="number" {...register('stock', { valueAsNumber: true })} />
            <TextField label="Unidad de stock" select {...register('stockUnit', { required: true })}>
              <MenuItem value="u">Unidades (u)</MenuItem>
              <MenuItem value="g">Gramos (g)</MenuItem>
              <MenuItem value="ml">Mililitros (ml)</MenuItem>
            </TextField>
            <TextField label="Unidad de compra" {...register('purchaseUnit', { required: true })} />
            <TextField label="Factor de conversión" type="number" {...register('conversionFactor', { valueAsNumber: true, required: true })} />
            <TextField label="Unidad de conversión" select {...register('conversionUnit', { required: true })}>
              <MenuItem value="u">Unidades (u)</MenuItem>
              <MenuItem value="g">Gramos (g)</MenuItem>
              <MenuItem value="ml">Mililitros (ml)</MenuItem>
            </TextField>
            <TextField label="Punto de pedido" type="number" {...register('reorderPoint', { valueAsNumber: true })} />
            <TextField label="Categoría" select {...register('category', { required: true })}>
              <MenuItem value="bebida">Bebida</MenuItem>
              <MenuItem value="cafe">Café</MenuItem>
              <MenuItem value="condimentos">Condimentos</MenuItem>
              <MenuItem value="frutas">Frutas</MenuItem>
              <MenuItem value="cereales">Cereales</MenuItem>
              <MenuItem value="lacteos">Lácteos</MenuItem>
              <MenuItem value="otros">Otros</MenuItem>
              <MenuItem value="proteinas">Proteínas</MenuItem>
              <MenuItem value="vegetales">Vegetales</MenuItem>
            </TextField>
            <TextField label="Código artículo compra" {...register('codeArticlePurchase')} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancelar</Button>
          <Button onClick={onSubmit} variant="contained" disabled={isSubmitting}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={Boolean(confirmDelete)} onClose={() => setConfirmDelete(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Confirmar eliminación</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Estás seguro de que deseas eliminar el ingrediente "{confirmDelete?.name}"?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(null)}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={confirmDeleteIngredient}>
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
};

export default IngredientsPage;

