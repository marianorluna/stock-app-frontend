import { useEffect, useMemo, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Autocomplete,
  Button,
  Card,
  CardContent,
  Divider,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  MenuItem
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useForm, useFieldArray, Controller, useWatch } from 'react-hook-form';
import { useInventoryStore } from '../../hooks/useInventoryStore';
import type { ManualWastagePayload } from '../../types';

type ItemCategory = 'ingredient' | 'beverage';

type Props = {
  onSubmitted?: () => void;
};

type ManualWastageFormValues = {
  items: Array<{
    itemId: string;
    quantity: number;
    reason?: string;
  }>;
};

const defaultValues: ManualWastageFormValues = {
  items: [{ itemId: '', quantity: 0, reason: '' }]
};

const WEIGHT_EQUIVALENCES = [
  { label: 'Huevo M', value: '58 g' },
  { label: 'Huevo L', value: '68 g' },
  { label: 'Huevo XL', value: '73 g' },
  { label: 'Tortilla de maíz', value: '20 g' },
  { label: 'Recarga de Sifón', value: '8 g' }
];

const WASTAGE_REASONS = [
  'Ajuste de inventario',
  'Podrido',
  'Vencido',
  'Rotura de envase',
  'Derrame',
  'Contaminación',
  'Daño por manipulación',
  'Pérdida en almacén',
  'Error en preparación',
  'Calidad deficiente',
  'Exceso de producción',
  'Otros'
];

const ManualWastageForm = ({ onSubmitted }: Props) => {
  const {
    ingredients,
    fetchIngredients,
    beverages,
    fetchBeverages,
    createWastage
  } = useInventoryStore((state) => ({
    ingredients: state.ingredients,
    fetchIngredients: state.fetchIngredients,
    beverages: state.beverages,
    fetchBeverages: state.fetchBeverages,
    createWastage: state.createWastage
  }));

  const [itemCategory, setItemCategory] = useState<ItemCategory>('ingredient');
  const [showOtherReason, setShowOtherReason] = useState<{ [key: number]: boolean }>({});

  const ingredientOptions = useMemo(
    () =>
      ingredients.map((ingredient) => ({
        label: ingredient.description?.trim() || ingredient.name,
        value: ingredient._id
      })),
    [ingredients]
  );

  const beverageOptions = useMemo(
    () =>
      beverages.map((beverage) => ({
        label: beverage.name,
        value: beverage._id
      })),
    [beverages]
  );

  const itemOptions = itemCategory === 'ingredient' ? ingredientOptions : beverageOptions;
  const unitLabel = itemCategory === 'ingredient' ? 'g' : 'u';

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting }
  } = useForm<ManualWastageFormValues>({ defaultValues });

  const { fields } = useFieldArray({ control, name: 'items' });
  const watchedItems = useWatch({ control, name: 'items' }) ?? [];

  const isFormValid = useMemo(() => {
    if (!watchedItems || watchedItems.length === 0) return false;
    return watchedItems.every(
      (item) =>
        item.itemId &&
        item.itemId.trim() !== '' &&
        item.quantity &&
        Number(item.quantity) > 0 &&
        item.reason &&
        item.reason.trim() !== ''
    );
  }, [watchedItems]);

  useEffect(() => {
    void fetchIngredients();
  }, [fetchIngredients]);

  useEffect(() => {
    void fetchBeverages();
  }, [fetchBeverages]);

  const handleCategoryChange = (_: React.MouseEvent<HTMLElement>, value: ItemCategory | null) => {
    if (!value) return;
    setItemCategory(value);
    reset(defaultValues);
    setShowOtherReason({});
  };

  const onSubmit = handleSubmit(async (values) => {
    const items = values.items.reduce<ManualWastagePayload['items']>((acc, item) => {
      const quantity = Number(item.quantity ?? 0);
      if (!quantity || quantity <= 0 || !item.itemId) return acc;

      if (itemCategory === 'ingredient') {
        acc.push({ ingredient: item.itemId, quantityInGrams: quantity, reason: item.reason });
      } else {
        acc.push({ beverage: item.itemId, quantityInUnits: quantity, reason: item.reason });
      }
      return acc;
    }, []);

    if (items.length === 0) return;

    await createWastage({ items });
    reset(defaultValues);
    setShowOtherReason({});
    onSubmitted?.();
  });

  return (
    <Stack spacing={2}>
      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Registrar merma manual
          </Typography>
          <Stack spacing={2} component="form" onSubmit={onSubmit}>

            {/* ── Selector de tipo de ítem ── */}
            <Stack spacing={1}>
              <Typography variant="subtitle2" color="text.secondary">
                Tipo de ítem
              </Typography>
              <ToggleButtonGroup
                value={itemCategory}
                exclusive
                onChange={handleCategoryChange}
                size="small"
                fullWidth
              >
                <ToggleButton value="ingredient" sx={{ flex: 1 }}>Ingrediente</ToggleButton>
                <ToggleButton value="beverage" sx={{ flex: 1 }}>Bebida</ToggleButton>
              </ToggleButtonGroup>
            </Stack>

            {/* ── Filas de items ── */}
            {fields.map((field, index) => (
              <Stack key={field.id} direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Controller
                  control={control}
                  name={`items.${index}.itemId`}
                  rules={{ required: true }}
                  render={({ field: itemField }) => (
                    <Autocomplete
                      sx={{ minWidth: 240 }}
                      options={itemOptions}
                      value={itemOptions.find((option) => option.value === itemField.value) ?? null}
                      onChange={(_, value) => itemField.onChange(value?.value ?? '')}
                      isOptionEqualToValue={(option, value) => option.value === value.value}
                      getOptionLabel={(option) => option.label}
                      renderOption={(props, option) => (
                        <li {...props} key={option.value}>
                          {option.label}
                        </li>
                      )}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label={itemCategory === 'ingredient' ? 'Ingrediente' : 'Bebida'}
                          required
                          placeholder={
                            itemCategory === 'ingredient'
                              ? 'Selecciona un ingrediente'
                              : 'Selecciona una bebida'
                          }
                          InputLabelProps={{ shrink: true }}
                        />
                      )}
                    />
                  )}
                />
                <Controller
                  control={control}
                  name={`items.${index}.quantity`}
                  rules={{ required: true, min: 1 }}
                  render={({ field }) => (
                    <TextField
                      label={`Cantidad (${unitLabel})`}
                      type="number"
                      value={field.value}
                      onFocus={(event) => event.target.select()}
                      onChange={(event) => {
                        const rawValue = event.target.value;
                        const normalizedValue = rawValue.replace(/^0+(?=\d)/, '');
                        event.target.value = normalizedValue;
                        field.onChange(normalizedValue === '' ? 0 : Number(normalizedValue));
                      }}
                      required
                      sx={{ minWidth: 160 }}
                    />
                  )}
                />
                <Controller
                  control={control}
                  name={`items.${index}.reason`}
                  rules={{ required: true }}
                  render={({ field }) => {
                    const currentValue = field.value || '';
                    const isCustomValue = currentValue !== '' && !WASTAGE_REASONS.includes(currentValue);
                    const shouldShowOther = showOtherReason[index] || isCustomValue;

                    return (
                      <>
                        <TextField
                          select
                          label="Motivo"
                          required
                          sx={{ minWidth: 240 }}
                          InputLabelProps={{ shrink: true }}
                          value={shouldShowOther ? 'Otros' : currentValue}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === 'Otros') {
                              setShowOtherReason(prev => ({ ...prev, [index]: true }));
                              if (!isCustomValue) field.onChange('');
                            } else {
                              setShowOtherReason(prev => ({ ...prev, [index]: false }));
                              field.onChange(value);
                            }
                          }}
                          SelectProps={{
                            displayEmpty: true,
                            renderValue: (selected) => {
                              if (!selected || selected === '') {
                                return <span style={{ color: '#9e9e9e' }}>Selecciona un motivo</span>;
                              }
                              return selected as string;
                            }
                          }}
                        >
                          <MenuItem value="" disabled>
                            Selecciona un motivo
                          </MenuItem>
                          {WASTAGE_REASONS.map((reason) => (
                            <MenuItem key={reason} value={reason}>
                              {reason}
                            </MenuItem>
                          ))}
                        </TextField>
                        {shouldShowOther && (
                          <TextField
                            label="Especificar motivo"
                            value={currentValue}
                            onChange={(e) => field.onChange(e.target.value)}
                            required
                            placeholder="Añadir motivo de la merma"
                            sx={{ minWidth: 240 }}
                            InputLabelProps={{ shrink: true }}
                          />
                        )}
                      </>
                    );
                  }}
                />
              </Stack>
            ))}

            <Button type="submit" variant="contained" disabled={isSubmitting || !isFormValid}>
              Registrar merma
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* ── Equivalencias de pesos ── */}
      <Card variant="outlined">
        <Accordion disableGutters elevation={0} sx={{ '&:before': { display: 'none' } }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6" sx={{ mb: 1, mt: 1 }}>
              Equivalencias de Pesos
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 0 }}>
            <Stack divider={<Divider />}>
              {WEIGHT_EQUIVALENCES.map((item) => (
                <Stack
                  key={item.label}
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{ py: 1 }}
                >
                  <Typography variant="body2">{item.label}</Typography>
                  <Typography variant="body2" color="text.secondary" fontWeight={500}>
                    {item.value}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </AccordionDetails>
        </Accordion>
      </Card>

    </Stack>
  );
};

export default ManualWastageForm;
