import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
  InputAdornment
} from '@mui/material';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { useInventoryStore } from '../hooks/useInventoryStore';
import apiClient from '../services/apiClient';
import type { Ingredient } from '../types';
import { RequirePermission } from '../components/auth/RequirePermission';
import SearchIcon from '@mui/icons-material/Search';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import TagIcon from '@mui/icons-material/Tag';

// Mapeo categoryName → elemento SKU (según SKU_ELEMENTS.md, sección Ingredientes)
const CATEGORY_ELEMENT_MAP: Record<string, string> = {
  'Lacteos': 'LV',
  'Cereales': 'GR',
  'Condimentos': 'CO',
  'Vegetales': 'VG',
  'Frutas': 'FR',
  'Proteinas': 'PR',
  'Gases': 'GS',
  'Bebidas': 'BE',
  'Cafe': 'CF',
  'Aceites': 'AC',
  'Frutos secos': 'FS',
  'Dulces': 'DL'
};

const INGREDIENT_CATEGORIES = Object.keys(CATEGORY_ELEMENT_MAP);

// Genera un código de 3 letras a partir del nombre (primeras 3 letras significativas)
const nameToCode = (name: string): string => {
  const cleaned = name.replace(/[^a-zA-Z]/g, '').toUpperCase();
  return cleaned.substring(0, 3).padEnd(3, 'X');
};

// Genera un SKU único y correlativo para un ingrediente
const generateIngredientSku = (
  categoryName: string,
  name: string,
  existingSkus: string[]
): string => {
  const element = CATEGORY_ELEMENT_MAP[categoryName];
  if (!element || !name.trim()) return '';

  const prefix = `I${element}`;

  // Extraer números existentes para este elemento (formato: I[EL][4 dígitos][3 letras])
  const existingNumbers = existingSkus
    .filter((sku) => sku.startsWith(prefix) && sku.length === 10)
    .map((sku) => parseInt(sku.substring(3, 7), 10))
    .filter((n) => !isNaN(n));

  const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
  const nextNumber = maxNumber + 10;
  const paddedNumber = String(nextNumber).padStart(4, '0');
  const code = nameToCode(name);

  const candidate = `${prefix}${paddedNumber}${code}`;

  // Si el candidato ya existe (por coincidencia de código), seguir incrementando
  if (existingSkus.includes(candidate)) {
    const fallbackNumber = nextNumber + 1; // usa reservado +1
    return `${prefix}${String(fallbackNumber).padStart(4, '0')}${code}`;
  }

  return candidate;
};

type IngredientFormValues = {
  name: string;
  categoryName: string;
  stock: number;
  reorderPoint: number;
  allergens: string[];
  codeArticlePurchase: string;
};

const defaultValues: IngredientFormValues = {
  name: '',
  categoryName: '',
  stock: 0,
  reorderPoint: 0,
  allergens: [],
  codeArticlePurchase: ''
};

const commonAllergens = ['huevo', 'lacteos', 'gluten', 'frutos secos', 'pescado'];

// Sub-componente para preview del SKU (se actualiza reactivamente)
const SkuPreview = ({
  control,
  existingSkus,
  editSku
}: {
  control: ReturnType<typeof useForm<IngredientFormValues>>['control'];
  existingSkus: string[];
  editSku?: string;
}) => {
  const name = useWatch({ control, name: 'name' });
  const categoryName = useWatch({ control, name: 'categoryName' });

  const sku = editSku ?? generateIngredientSku(categoryName, name, existingSkus);

  if (!sku) return null;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        px: 2,
        py: 1,
        bgcolor: 'action.hover',
        borderRadius: 1,
        border: '1px solid',
        borderColor: 'divider'
      }}
    >
      <TagIcon fontSize="small" color="primary" />
      <Typography variant="body2" color="text.secondary">
        SKU generado:
      </Typography>
      <Typography variant="body2" fontWeight={700} fontFamily="monospace">
        {sku}
      </Typography>
    </Box>
  );
};

const IngredientsPage = () => {
  const { ingredients, fetchIngredients, error } = useInventoryStore((state) => ({
    ingredients: state.ingredients,
    fetchIngredients: state.fetchIngredients,
    error: state.error
  }));
  const [open, setOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Ingredient | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    control,
    getValues,
    formState: { isSubmitting }
  } = useForm<IngredientFormValues>({ defaultValues });

  useEffect(() => {
    void fetchIngredients();
  }, [fetchIngredients]);

  const existingSkus = useMemo(() => ingredients.map((i) => i.sku).filter(Boolean), [ingredients]);

  const filteredIngredients = useMemo(() => {
    const normalizedTerm = searchTerm.trim().toLowerCase();
    if (!normalizedTerm) return ingredients;
    return ingredients.filter((ingredient) =>
      ingredient.name.toLowerCase().includes(normalizedTerm)
    );
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
      categoryName: ingredient.categoryName ?? '',
      stock: ingredient.stock,
      reorderPoint: ingredient.reorderPoint ?? 0,
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
      // En edición: no cambiar el SKU
      await apiClient.put<Ingredient>(`/ingredients/${selectedIngredient._id}`, {
        name: values.name,
        stock: values.stock,
        reorderPoint: values.reorderPoint,
        allergens: values.allergens,
        codeArticlePurchase: values.codeArticlePurchase
      });
    } else {
      // En creación / duplicación: generar SKU automáticamente
      const sku = generateIngredientSku(values.categoryName, values.name, existingSkus);
      if (!sku) {
        return; // No debería ocurrir si la validación funciona
      }
      await apiClient.post<Ingredient>('/ingredients', { ...values, sku });
    }
    setOpen(false);
    setSelectedIngredient(null);
    await fetchIngredients();
  });

  const dialogTitle = dialogMode === 'edit' ? 'Editar ingrediente' : 'Crear nuevo ingrediente';

  const isEditMode = dialogMode === 'edit';

  return (
    <Grid container spacing={3} sx={{ py: 0 }}>
      <Grid item xs={12}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h4">Ingredientes</Typography>
          <RequirePermission resource="ingredients" action="create" hide>
            <Button variant="contained" onClick={handleOpen}>
              Crear Nuevo
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
      <Grid item xs={12}>
        <Typography variant="body2" color="text.secondary">
          Mostrando {filteredIngredients.length} {filteredIngredients.length === 1 ? 'ingrediente' : 'ingredientes'}
        </Typography>
      </Grid>
      {filteredIngredients.map((ingredient) => (
        <Grid item xs={12} md={6} key={ingredient._id}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6">{ingredient.description ?? ingredient.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {ingredient.categoryName ?? '—'} · <Typography component="span" variant="body2" fontFamily="monospace">{ingredient.sku}</Typography>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Punto de pedido: {ingredient.reorderPoint} g
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
            <TextField
              label="Nombre"
              {...register('name', { required: true })}
            />
            {isEditMode ? (
              // En edición: mostrar SKU y categoría como solo lectura
              <Stack spacing={2}>
                <TextField
                  label="Categoría"
                  value={getValues('categoryName')}
                  InputProps={{ readOnly: true }}
                  helperText="La categoría no se puede cambiar sin modificar el SKU"
                />
                <TextField
                  label="SKU"
                  value={selectedIngredient?.sku ?? ''}
                  InputProps={{ readOnly: true }}
                  helperText="El SKU es inmutable"
                />
              </Stack>
            ) : (
              // En creación / duplicación: selector de categoría + preview SKU
              <Stack spacing={2}>
                <TextField
                  select
                  label="Categoría *"
                  defaultValue=""
                  {...register('categoryName', { required: true })}
                  helperText="La categoría determina el elemento del SKU"
                >
                  {INGREDIENT_CATEGORIES.map((cat) => (
                    <MenuItem key={cat} value={cat}>
                      {cat} <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>({CATEGORY_ELEMENT_MAP[cat]})</Typography>
                    </MenuItem>
                  ))}
                </TextField>
                <SkuPreview
                  control={control}
                  existingSkus={existingSkus}
                />
              </Stack>
            )}
            <TextField
              label="Stock inicial (g)"
              type="number"
              {...register('stock', { valueAsNumber: true })}
            />
            <TextField
              label="Punto de pedido (g)"
              type="number"
              {...register('reorderPoint', { valueAsNumber: true })}
            />
            <Controller
              control={control}
              name="allergens"
              render={({ field: { onChange, value } }) => (
                <Autocomplete
                  multiple
                  freeSolo
                  options={commonAllergens}
                  value={value || []}
                  onChange={(_, newValue) => onChange(newValue)}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip
                        variant="outlined"
                        label={option}
                        {...getTagProps({ index })}
                        key={index}
                      />
                    ))
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Alérgenos"
                      placeholder="Seleccionar o escribir alérgenos"
                    />
                  )}
                />
              )}
            />
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
