import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import { useForm, useFieldArray, Controller, useWatch } from 'react-hook-form';
import { useInventoryStore } from '../hooks/useInventoryStore';
import apiClient from '../services/apiClient';
import { RequirePermission } from '../components/auth/RequirePermission';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import type { Dish } from '../types';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import TagIcon from '@mui/icons-material/Tag';

// Mapeo categoryName → elemento SKU (según SKU_ELEMENTS.md, sección Recetas)
const CATEGORY_ELEMENT_MAP: Record<string, string> = {
  'Platos': 'PL',
  'Carta': 'CT',
  'Platos principales': 'PP',
  'Combo': 'CB',
  'Postres': 'PT',
  'Entrantes': 'EN',
  'Menu del dia': 'MD',
  'Null': 'NL',
  'Cafe': 'CA'
};

const RECIPE_CATEGORIES = Object.keys(CATEGORY_ELEMENT_MAP);

// Genera un código de 3 letras a partir del nombre
const nameToCode = (name: string): string => {
  const cleaned = name.replace(/[^a-zA-Z]/g, '').toUpperCase();
  return cleaned.substring(0, 3).padEnd(3, 'X');
};

// Genera un SKU único y correlativo para una receta
const generateRecipeSku = (
  categoryName: string,
  name: string,
  existingSkus: string[]
): string => {
  const element = CATEGORY_ELEMENT_MAP[categoryName];
  if (!element || !name.trim()) return '';

  const prefix = `R${element}`;

  // Extraer números existentes para este elemento (formato: R[EL][4 dígitos][3 letras])
  const existingNumbers = existingSkus
    .filter((sku) => sku.startsWith(prefix) && sku.length === 10)
    .map((sku) => parseInt(sku.substring(3, 7), 10))
    .filter((n) => !isNaN(n));

  const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
  const nextNumber = maxNumber + 10;
  const paddedNumber = String(nextNumber).padStart(4, '0');
  const code = nameToCode(name);

  const candidate = `${prefix}${paddedNumber}${code}`;

  // Si el candidato ya existe, usar el reservado +1
  if (existingSkus.includes(candidate)) {
    const fallbackNumber = nextNumber + 1;
    return `${prefix}${String(fallbackNumber).padStart(4, '0')}${code}`;
  }

  return candidate;
};

type RecipeFormValues = {
  name: string;
  categoryName: string;
  description?: string;
  productId: string;
  recipe: Array<{
    ingredient: string;
    quantityInGrams: number;
  }>;
};

const defaultValues: RecipeFormValues = {
  name: '',
  categoryName: '',
  description: '',
  productId: '',
  recipe: [{ ingredient: '', quantityInGrams: 0 }]
};

// Sub-componente para preview del SKU (se actualiza reactivamente)
const SkuPreview = ({
  control,
  existingSkus,
  editSku
}: {
  control: ReturnType<typeof useForm<RecipeFormValues>>['control'];
  existingSkus: string[];
  editSku?: string;
}) => {
  const name = useWatch({ control, name: 'name' });
  const categoryName = useWatch({ control, name: 'categoryName' });

  const sku = editSku ?? generateRecipeSku(categoryName, name, existingSkus);

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

const RecipesPage = () => {
  const { dishes, ingredients, fetchDishes, fetchIngredients, error } = useInventoryStore((state) => ({
    dishes: state.dishes,
    ingredients: state.ingredients,
    fetchDishes: state.fetchDishes,
    fetchIngredients: state.fetchIngredients,
    error: state.error
  }));
  const [open, setOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | 'duplicate'>('create');
  const [selectedDish, setSelectedDish] = useState<Dish | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Dish | null>(null);
  const {
    control,
    handleSubmit,
    reset,
    getValues,
    formState: { isSubmitting }
  } = useForm<RecipeFormValues>({ defaultValues });

  const { fields, append, remove } = useFieldArray({ control, name: 'recipe' });
  const [searchTerm, setSearchTerm] = useState('');
  const recipes = useMemo(() => dishes.filter((dish) => dish.type !== 'drink'), [dishes]);
  const filteredRecipes = useMemo(() => {
    const normalizedTerm = searchTerm.trim().toLowerCase();
    if (!normalizedTerm) return recipes;
    return recipes.filter((dish) => {
      const nameMatch = dish.name.toLowerCase().includes(normalizedTerm);
      const descriptionMatch = dish.description?.toLowerCase().includes(normalizedTerm) ?? false;
      return nameMatch || descriptionMatch;
    });
  }, [recipes, searchTerm]);

  const existingSkus = useMemo(() =>
    dishes
      .map((d) => d.sku)
      .filter((sku): sku is string => Boolean(sku)),
    [dishes]
  );

  useEffect(() => {
    void fetchIngredients();
    void fetchDishes();
  }, [fetchIngredients, fetchDishes]);

  const ingredientOptions = useMemo(
    () =>
      ingredients
        .map((ingredient) => ({
          label: ingredient.description ?? ingredient.name,
          value: ingredient._id
        })),
    [ingredients]
  );

  const mapDishToFormValues = (dish: Dish): RecipeFormValues => {
    const recipe =
      dish.recipe && dish.recipe.length > 0
        ? dish.recipe.map((item) => ({
          ingredient: typeof item.ingredient === 'string' ? item.ingredient : item.ingredient?._id ?? '',
          quantityInGrams: item.quantityInGrams ?? 0
        }))
        : [{ ingredient: '', quantityInGrams: 0 }];
    // Si productId es "S/PID" (valor por defecto), mostrar como vacío
    const productId = dish.productId === 'S/PID' ? '' : (dish.productId ?? '');
    return {
      name: dish.name,
      categoryName: '', // Las recetas existentes no tienen categoryName, se deriva del SKU
      description: dish.description ?? '',
      productId,
      recipe
    };
  };

  const handleOpen = () => {
    setDialogMode('create');
    setSelectedDish(null);
    reset(defaultValues);
    setOpen(true);
  };

  const handleEdit = (dish: Dish) => {
    setDialogMode('edit');
    setSelectedDish(dish);
    reset(mapDishToFormValues(dish));
    setOpen(true);
  };

  const handleDuplicate = (dish: Dish) => {
    setDialogMode('duplicate');
    setSelectedDish(dish);
    const mapped = mapDishToFormValues(dish);
    reset({
      ...mapped,
      name: `${mapped.name} (copia)`,
      categoryName: '' // Resetear para generar nuevo SKU
    });
    setOpen(true);
  };

  const handleDelete = (dish: Dish) => {
    setConfirmDelete(dish);
  };

  const confirmDeleteDish = async () => {
    if (!confirmDelete) return;
    await apiClient.delete(`/dishes/${confirmDelete._id}`);
    setConfirmDelete(null);
    await fetchDishes();
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedDish(null);
  };

  const onSubmit = handleSubmit(async (values) => {
    const recipe = values.recipe
      .filter((item) => item.ingredient && item.quantityInGrams > 0)
      .map((item) => ({
        ingredient: item.ingredient,
        quantityInGrams: item.quantityInGrams
      }));

    // Si productId está vacío, usar "S/PID" como valor por defecto
    const productId = values.productId.trim() || 'S/PID';

    // Definir el tipo del payload correctamente
    const payload: {
      name: string;
      description?: string;
      productId: string;
      recipe: Array<{
        ingredient: string;
        quantityInGrams: number;
      }>;
    } = {
      name: values.name,
      description: values.description?.trim() || undefined,
      productId,
      recipe
    };

    if (dialogMode === 'edit' && selectedDish) {
      // En edición: no cambiar el SKU
      await apiClient.put(`/dishes/${selectedDish._id}`, payload);
    } else {
      // En creación / duplicación: generar SKU automáticamente
      const sku = generateRecipeSku(values.categoryName, values.name, existingSkus);
      if (!sku) return;
      await apiClient.post<Dish>('/dishes', { ...payload, sku });
    }
    setOpen(false);
    setSelectedDish(null);
    await fetchDishes();
  });

  const dialogTitle =
    dialogMode === 'edit'
      ? 'Editar receta'
      : dialogMode === 'duplicate'
        ? 'Duplicar receta'
        : 'Crear nueva receta';

  const isEditMode = dialogMode === 'edit';

  return (
    <Grid container spacing={3} sx={{ py: 0 }}>
      <Grid item xs={12}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h4">Recetas</Typography>
          <RequirePermission resource="recipes" action="create" hide>
            <Button variant="contained" onClick={handleOpen}>
              Crear Nueva
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
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          alignItems={{ sm: 'center' }}
          sx={{ width: '100%' }}
        >
          <TextField
            size="small"
            placeholder="Buscar recetas"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            sx={{ flex: 1, minWidth: 0 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
              endAdornment: searchTerm ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearchTerm('')} edge="end">
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : null
            }}
          />
          {searchTerm && (
            <Button
              size="small"
              sx={{ flexShrink: 0, whiteSpace: 'nowrap' }}
              onClick={() => setSearchTerm('')}
            >
              Limpiar
            </Button>
          )}
        </Stack>
      </Grid>
      <Grid item xs={12}>
        <Typography variant="body2" color="text.secondary">
          Mostrando {filteredRecipes.length} {filteredRecipes.length === 1 ? 'receta' : 'recetas'}
        </Typography>
      </Grid>

      {filteredRecipes.map((dish) => (
        <Grid item xs={12} md={6} key={dish._id}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6">{dish.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                <Typography component="span" variant="body2" fontFamily="monospace">{dish.sku}</Typography>
                {dish.description && ` · ${dish.description}`}
              </Typography>
              <Stack spacing={0.5} sx={{ mt: 1 }}>
                {dish.recipe.map((item, index) => {
                  const ingredientRef = item.ingredient;
                  const ingredientId =
                    typeof ingredientRef === 'string' ? ingredientRef : ingredientRef?._id ?? '';
                  const ingredient = typeof ingredientRef === 'object' && ingredientRef !== null
                    ? ingredientRef
                    : ingredients.find((ingredient) => ingredient._id === ingredientId);
                  const ingredientDisplay = ingredient?.description ?? ingredient?.name ?? ingredientId;

                  return (
                    <Typography key={`${dish._id}-${ingredientId}-${index}`} variant="body2">
                      {ingredientDisplay} • {item.quantityInGrams} g
                    </Typography>
                  );
                })}
              </Stack>
              <Stack direction="row" spacing={1.5} sx={{ mt: 2 }}>
                <RequirePermission resource="recipes" action="update" hide>
                  <Button
                    size="small"
                    startIcon={<EditOutlinedIcon fontSize="small" />}
                    onClick={() => handleEdit(dish)}
                  >
                    Editar
                  </Button>
                </RequirePermission>
                <RequirePermission resource="recipes" action="delete" hide>
                  <Button
                    size="small"
                    color="error"
                    startIcon={<DeleteOutlineIcon fontSize="small" />}
                    onClick={() => handleDelete(dish)}
                  >
                    Eliminar
                  </Button>
                </RequirePermission>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      ))}

      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md">
        <DialogTitle>{dialogTitle}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {isEditMode ? (
              // En edición: mostrar SKU como solo lectura
              <TextField
                label="SKU"
                value={selectedDish?.sku ?? ''}
                InputProps={{ readOnly: true }}
                helperText="El SKU es inmutable"
              />
            ) : (
              // En creación / duplicación: selector de categoría + preview SKU
              <Stack spacing={2}>
                <SkuPreview
                  control={control}
                  existingSkus={existingSkus}
                />
                <Controller
                  control={control}
                  name="categoryName"
                  rules={{ required: true }}
                  render={({ field }) => (
                    <TextField
                      select
                      label="Categoría *"
                      {...field}
                      helperText="La categoría determina el elemento del SKU"
                    >
                      {RECIPE_CATEGORIES.map((cat) => (
                        <MenuItem key={cat} value={cat}>
                          {cat} <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>({CATEGORY_ELEMENT_MAP[cat]})</Typography>
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />
              </Stack>
            )}
            <Controller
              control={control}
              name="name"
              rules={{ required: true }}
              render={({ field }) => <TextField label="Nombre" {...field} />}
            />
            {!isEditMode && (
              <Controller
                control={control}
                name="productId"
                render={({ field }) => (
                  <TextField
                    label="ID Producto (Qmarero)"
                    {...field}
                    helperText="ID del producto en Qmarero. Si no se especifica, se usará 'S/PID'"
                  />
                )}
              />
            )}
            <Controller
              control={control}
              name="description"
              render={({ field }) => <TextField label="Descripción" {...field} multiline minRows={2} />}
            />
            <Typography variant="subtitle1">Ingredientes</Typography>
            <Stack spacing={2}>
              {fields.map((field, index) => (
                <Stack key={field.id} direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-start">
                  <Controller
                    control={control}
                    name={`recipe.${index}.ingredient`}
                    rules={{ required: true }}
                    render={({ field: ingredientField }) => (
                      <Autocomplete
                        sx={{ minWidth: 220 }}
                        options={ingredientOptions}
                        getOptionLabel={(option) => option.label}
                        value={ingredientOptions.find((option) => option.value === ingredientField.value) ?? null}
                        onChange={(_, value) => ingredientField.onChange(value?.value ?? '')}
                        isOptionEqualToValue={(option, value) => option.value === value.value}
                        renderInput={(params) => <TextField {...params} label="Ingrediente" />}
                      />
                    )}
                  />
                  <Controller
                    control={control}
                    name={`recipe.${index}.quantityInGrams`}
                    rules={{
                      required: true,
                      min: 1,
                      validate: (value) => {
                        if (value !== 0 && value !== Math.floor(value)) {
                          return 'La cantidad debe ser un número entero';
                        }
                        return true;
                      }
                    }}
                    render={({ field: { onChange, value, ...field }, fieldState: { error } }) => (
                      <TextField
                        {...field}
                        label="Cantidad (g)"
                        type="number"
                        inputProps={{ min: 1, step: 1 }}
                        value={value === 0 ? '' : value ?? ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '') {
                            onChange(0);
                          } else {
                            // Redondear a entero
                            const intValue = Math.floor(Number(val));
                            onChange(intValue);
                          }
                        }}
                        error={!!error}
                        helperText={error?.message}
                      />
                    )}
                  />
                  <Button color="error" onClick={() => remove(index)}>
                    Eliminar
                  </Button>
                </Stack>
              ))}
              <Button onClick={() => append({ ingredient: '', quantityInGrams: 0 })}>Agregar ingrediente</Button>
            </Stack>
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
          <Stack spacing={2}>
            <Typography>
              ¿Estás seguro de que deseas eliminar la receta "{confirmDelete?.name}"?
            </Typography>
            <Alert severity="warning">
              <Typography variant="body2" fontWeight="bold" gutterBottom>
                Advertencia: Esta acción es irreversible
              </Typography>
              <Typography variant="body2">
                La eliminación de esta receta afectará los cálculos del inventario y las operaciones relacionadas.
              </Typography>
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(null)}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={confirmDeleteDish}>
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
};

export default RecipesPage;
