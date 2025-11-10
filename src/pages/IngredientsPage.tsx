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
import SearchIcon from '@mui/icons-material/Search';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

type IngredientFormValues = {
  name: string;
  stock: number;
  purchaseUnit: string;
  productUnit: string;
  conversionFactorToGrams: number;
  reorderPoint: number;
  category: 'ingredient' | 'beverage' | 'coffee';
};

const defaultValues: IngredientFormValues = {
  name: '',
  stock: 0,
  purchaseUnit: 'g',
  productUnit: 'g',
  conversionFactorToGrams: 1,
  reorderPoint: 0,
  category: 'ingredient'
};

const IngredientsPage = () => {
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
    return ingredients
      .filter((ingredient) => ingredient.category === 'ingredient')
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
      stock: ingredient.stock,
      purchaseUnit: ingredient.purchaseUnit ?? 'g',
      productUnit: ingredient.productUnit ?? ingredient.purchaseUnit ?? 'g',
      conversionFactorToGrams: ingredient.conversionFactorToGrams ?? 1,
      reorderPoint: ingredient.reorderPoint ?? 0,
      category: ingredient.category ?? 'ingredient'
    });
    setOpen(true);
  };

  const handleDuplicate = (ingredient: Ingredient) => {
    setDialogMode('duplicate');
    setSelectedIngredient(ingredient);
    reset({
      name: `${ingredient.name} (copia)`,
      stock: ingredient.stock,
      purchaseUnit: ingredient.purchaseUnit ?? 'g',
      productUnit: ingredient.productUnit ?? ingredient.purchaseUnit ?? 'g',
      conversionFactorToGrams: ingredient.conversionFactorToGrams ?? 1,
      reorderPoint: ingredient.reorderPoint ?? 0,
      category: ingredient.category ?? 'ingredient'
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
          <Button variant="contained" onClick={handleOpen}>
            Nuevo ingrediente
          </Button>
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
                {ingredient.productUnit ?? ingredient.purchaseUnit ?? 'g'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Punto de pedido: {ingredient.reorderPoint}{' '}
                {ingredient.productUnit ?? ingredient.purchaseUnit ?? 'g'}
              </Typography>
              <Stack direction="row" spacing={1.5} sx={{ mt: 2 }}>
                <Button
                  size="small"
                  startIcon={<EditOutlinedIcon fontSize="small" />}
                  onClick={() => handleEdit(ingredient)}
                >
                  Editar
                </Button>
                <Button
                  size="small"
                  startIcon={<ContentCopyIcon fontSize="small" />}
                  onClick={() => handleDuplicate(ingredient)}
                >
                  Duplicar
                </Button>
                <Button
                  size="small"
                  color="error"
                  startIcon={<DeleteOutlineIcon fontSize="small" />}
                  onClick={() => handleDelete(ingredient)}
                >
                  Eliminar
                </Button>
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
            <TextField label="Stock inicial" type="number" {...register('stock', { valueAsNumber: true })} />
            <TextField label="Unidad de compra" {...register('purchaseUnit', { required: true })} />
            <TextField label="Unidad de producto" {...register('productUnit', { required: true })} />
            <TextField
              label="Factor conversión a gramos"
              type="number"
              {...register('conversionFactorToGrams', { valueAsNumber: true })}
            />
            <TextField label="Punto de pedido" type="number" {...register('reorderPoint', { valueAsNumber: true })} />
            <TextField label="Categoría" select defaultValue={defaultValues.category} {...register('category', { required: true })}>
              <MenuItem value="ingredient">Ingrediente</MenuItem>
              <MenuItem value="beverage">Bebida</MenuItem>
              <MenuItem value="coffee">Café</MenuItem>
            </TextField>
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

